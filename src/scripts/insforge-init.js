import { createClient } from '@insforge/sdk';

var insforge = createClient({
  baseUrl: 'https://4jbc5v9a.ap-southeast.insforge.app',
  anonKey: 'ik_fa0788c4f3d41860d0aa415c7fbee983'
});

window.DocDataEntry = window.DocDataEntry || {};
window.DocDataEntry.insforge = insforge;
window.DocDataEntry.currentUser = null;

insforge.auth.getCurrentUser().then(function (result) {
  var user = result.data?.user || null;
  window.DocDataEntry.currentUser = user;
  window.DocDataEntry.setupAuthUI(user);
  if (user) {
    window.DocDataEntry.loadUserDocs = function () {
      return insforge.database.from('documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    };
    window.DocDataEntry.saveUserDoc = function (doc) {
      return insforge.database.from('documents').insert({
        user_id: user.id,
        file_name: doc.fileName,
        file_size: doc.fileSize,
        input_format: doc.inputFormat,
        output_format: doc.outputFormat,
        fields: doc.fields,
        line_items: doc.lineItems,
        overall_confidence: doc.overallConfidence,
        raw_text: doc.rawText,
        status: doc.status || 'completed',
        needs_review: doc.needsReview || false
      }).select();
    };
    window.DocDataEntry.deleteUserDoc = function (docId) {
      return insforge.database.from('documents').delete().eq('id', docId).eq('user_id', user.id);
    };
  }
  window.dispatchEvent(new CustomEvent('insforge-ready', { detail: { user: user } }));
});

window.DocDataEntry.signInWithGoogle = function () {
  insforge.auth.signInWithOAuth('google', {
    redirectTo: window.location.origin + '/dashboard'
  });
};

window.DocDataEntry.signOut = function () {
  insforge.auth.signOut().then(function () {
    window.DocDataEntry.currentUser = null;
    window.location.href = '/';
  });
};

window.DocDataEntry.setupAuthUI = function (user) {
  var authContainer = document.getElementById('auth-container');
  if (!authContainer) return;
  if (user) {
    var name = user.email || user.id;
    authContainer.innerHTML = '<div class="flex items-center gap-3">' +
      '<span class="hidden sm:inline text-sm text-neutral-400">' + name + '</span>' +
      '<button id="signout-btn" class="rounded-lg border border-neutral-800 px-3 py-2 text-xs font-medium text-neutral-400 transition-all hover:border-neutral-700 hover:text-neutral-100">Sign out</button>' +
    '</div>';
    var signoutBtn = document.getElementById('signout-btn');
    if (signoutBtn) signoutBtn.addEventListener('click', window.DocDataEntry.signOut);
  } else {
    authContainer.innerHTML = '<button id="signin-btn" class="rounded-lg border border-neutral-800 px-3 py-2 text-xs font-medium text-neutral-400 transition-all hover:border-brand-500 hover:text-brand-400">Sign in</button>';
    var signinBtn = document.getElementById('signin-btn');
    if (signinBtn) signinBtn.addEventListener('click', window.DocDataEntry.signInWithGoogle);
  }
};

// Listen for OAuth callback detection
if (window.location.search.includes('insforge_code')) {
  insforge.auth.getCurrentUser().then(function (result) {
    if (result.data?.user) {
      window.location.href = '/dashboard';
    }
  });
}
