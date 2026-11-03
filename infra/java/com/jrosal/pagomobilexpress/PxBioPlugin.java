package com.jrosal.pagomobilexpress;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.security.KeyStore;
import java.security.ProviderException;
import java.util.Base64;
import java.util.concurrent.Executor;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Sella un payload con una clave AES-GCM de 256 bits que vive en el Keystore
 * de Android y exige biometría fuerte (huella o rostro) para usarse tanto al
 * cifrar (activar huella en la app) como al descifrar (entrar con huella).
 * El hardware jamás expone la clave: los blobs solo descifran en este
 * teléfono y pasando la puerta biométrica.
 */
@CapacitorPlugin(name = "PxBio")
public class PxBioPlugin extends Plugin {

    private static final String KEY_ALIAS = "px_biometric_key";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final int GCM_TAG_BITS = 128;

    @PluginMethod
    public void status(PluginCall call) {
        JSObject res = new JSObject();
        try {
            FragmentActivity act = act();
            BiometricManager bm = BiometricManager.from(act);
            int can = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
            res.put("hardware", can != BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE
                    && can != BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE);
            res.put("enrolled", can != BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED);
        } catch (Exception e) {
            res.put("hardware", false);
            res.put("enrolled", false);
        }
        res.put("plugin", true);
        call.resolve(res);
    }

    /** Cifra payload con la clave del Keystore (pidiendo biometría si hace falta). */
    @PluginMethod
    public void protect(PluginCall call) {
        String payload = call.getString("payload", null);
        if (payload == null) { call.reject("payload faltante"); return; }
        try {
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            try {
                c.init(Cipher.ENCRYPT_MODE, key(true));
                runEncryptNow(call, c, payload); // la sesión ya pasó por biometría hoy
            } catch (RuntimeException e) {
                // la clave exige autenticación de nuevo: pedimos huella y continuamos
                promptThen(call, c, () -> {
                    try {
                        c.init(Cipher.ENCRYPT_MODE, key(true));
                        runEncryptNow(call, c, payload);
                    } catch (Exception ex) { call.reject("no se pudo sellar: " + ex.getMessage()); }
                });
            }
        } catch (Exception e) {
            call.reject("no se pudo sellar: " + e.getMessage());
        }
    }

    private void runEncryptNow(PluginCall call, Cipher c, String payload) throws Exception {
        byte[] sealed = c.doFinal(payload.getBytes("UTF-8"));
        String blob = b64(c.getIV()) + ":" + b64(sealed);
        JSObject res = new JSObject();
        res.put("blob", blob);
        call.resolve(res);
    }

    /** Pide biometría y, si es válida, descifra el blob y devuelve el payload. */
    @PluginMethod
    public void unlock(PluginCall call) {
        String blob = call.getString("blob", null);
        if (blob == null || !blob.contains(":")) { call.reject("blob inválido"); return; }
        try {
            String[] parts = blob.split(":", 2);
            byte[] iv = b64d(parts[0]);
            byte[] sealed = b64d(parts[1]);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, key(false), new GCMParameterSpec(GCM_TAG_BITS, iv));

            promptThen(call, c, () -> {
                try {
                    byte[] out = c.doFinal(sealed);
                    JSObject res = new JSObject();
                    res.put("payload", new String(out, "UTF-8"));
                    call.resolve(res);
                } catch (Exception ex) {
                    call.reject("no se pudo descifrar: " + ex.getMessage());
                }
            });
        } catch (Exception e) {
            call.reject("no se pudo iniciar la biometría: " + e.getMessage());
        }
    }

    /** Muestra el BiometricPrompt con CryptoObject y ejecuta la continuación si sale bien. */
    private void promptThen(PluginCall call, Cipher cryptoCipher, Runnable ok) {
        FragmentActivity act = act();
        Executor ex = ContextCompat.getMainExecutor(act);
        BiometricPrompt prompt = new BiometricPrompt(act, ex, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                ok.run();
            }
            @Override
            public void onAuthenticationError(int code, CharSequence err) {
                if (code == BiometricPrompt.ERROR_NEGATIVE_BUTTON
                        || code == BiometricPrompt.ERROR_USER_CANCELED) {
                    call.reject("cancelado");
                } else {
                    call.reject("biometría no disponible: " + err);
                }
            }
        });
        BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Pagomóvil Express")
                .setSubtitle("Confirma con tu huella o rostro")
                .setNegativeButtonText("Cancelar")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK)
                .build();
        try {
            prompt.authenticate(info, new BiometricPrompt.CryptoObject(cryptoCipher));
        } catch (ProviderException e) {
            call.reject("biometría no disponible: " + e.getMessage());
        }
    }

    private FragmentActivity act() { return (FragmentActivity) bridge.getActivity(); }

    private static String b64(byte[] in) { return Base64.getEncoder().encodeToString(in); }
    private static byte[] b64d(String in) { return Base64.getDecoder().decode(in); }

    /** Obtiene o crea la clave AES del Keystore, ligada a la biometría del dispositivo. */
    private SecretKey key(boolean createIfMissing) throws Exception {
        KeyStore ks = KeyStore.getInstance(ANDROID_KEYSTORE);
        ks.load(null);
        KeyStore.Entry entry = ks.getEntry(KEY_ALIAS, null);
        if (entry instanceof KeyStore.SecretKeyEntry) {
            return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
        }
        if (!createIfMissing) throw new IllegalStateException("clave biométrica no existe");
        KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
        kg.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
                        KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setUserAuthenticationRequired(true)
                .setInvalidatedByBiometricEnrollment(true) // registro de huella nueva => re-activar
                .build());
        return kg.generateKey();
    }
}
