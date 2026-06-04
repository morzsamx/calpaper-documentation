(function () {
  var siteHeader = document.querySelector('.site-header');
  var navToggle = document.querySelector('.nav-toggle');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));

  if (!siteHeader || !navToggle) return;

  function setMenuOpen(open) {
    siteHeader.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  navToggle.addEventListener('click', function () {
    setMenuOpen(!siteHeader.classList.contains('nav-open'));
  });

  navLinks.forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });
}());
