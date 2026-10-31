// Promethia Quest settings. Edit and re-deploy to change.
window.PQ_CONFIG = {
  // FormSubmit endpoint (reused alias from the Promethia feedback form; delivers to the founder inbox)
  SUBMIT_URL: "https://formsubmit.co/ajax/f367fd71cd2bdb0ac95cca4d421210a7",
  // scout.html PIN, stored as SHA-256. To change it, run:
  //   printf '%s' 'NEWPIN' | sha256sum
  // and paste the hex here.
  SCOUT_PIN_SHA256: "1a78bd1c59f15c7b820872851274059b5fe9de1f352d86d147cc75d91aef3bd8",
  SKIP_AFTER_SEC: 150,   // "Skip level" appears after this long on a level...
  SKIP_AFTER_FAILS: 4,   // ...or after this many failed tries
  HINT_AFTER_SEC: 45,
  HINT_AFTER_FAILS: 2
};
