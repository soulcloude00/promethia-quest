// Promethia Quest settings. Edit and re-deploy to change.
window.PQ_CONFIG = {
  // FormSubmit endpoint (reused alias from the Promethia feedback form; delivers to the founder inbox)
  SUBMIT_URL: "https://formsubmit.co/ajax/f367fd71cd2bdb0ac95cca4d421210a7",
  // scout.html PIN, stored as SHA-256. To change it, run:
  //   printf '%s' 'NEWPIN' | sha256sum
  // and paste the hex here.
  SCOUT_PIN_SHA256: "9244f3ae9cd0066c58e4944a9ef6db8f32adaf193633b219a85c4c6eb72fbafe",
  // Supabase (publishable key; table is insert-only, reads need the scout PIN via RPC)
  SUPABASE_URL: "https://yzzfyuihbvltwurvfbam.supabase.co",
  SUPABASE_KEY: "sb_publishable_f_SMBMBU0DNSs7abpO2h2g_oMxCM4Jy",
  SKIP_AFTER_SEC: 150,   // "Skip level" appears after this long on a level...
  SKIP_AFTER_FAILS: 4,   // ...or after this many failed tries
  HINT_AFTER_SEC: 45,
  HINT_AFTER_FAILS: 2
};
