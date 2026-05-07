(function () {
  var siteHeader = document.querySelector('.site-header');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a:not(.nav-download)'));
  var navToggle = document.querySelector('.nav-toggle');
  if (!navLinks.length) return;

  function pageName(pathname) {
    var name = pathname.split('/').pop();
    return name || 'index.html';
  }

  function linkTarget(link) {
    var url = new URL(link.getAttribute('href'), window.location.href);
    return {
      page: pageName(url.pathname),
      hash: url.hash
    };
  }

  function setActive(activeLink) {
    navLinks.forEach(function (link) {
      var isActive = link === activeLink;
      link.classList.toggle('active', isActive);

      if (isActive) {
        link.setAttribute('aria-current', linkTarget(link).hash ? 'location' : 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function findLink(predicate) {
    for (var i = 0; i < navLinks.length; i += 1) {
      if (predicate(navLinks[i], linkTarget(navLinks[i]))) {
        return navLinks[i];
      }
    }

    return null;
  }

  function activeAnchorLink() {
    var offset = getHeaderHeight() + getHomeStackGap();
    var currentSection = null;

    navLinks.forEach(function (link) {
      var target = linkTarget(link);
      if (target.page !== 'index.html' || !target.hash) return;

      var section = document.querySelector(target.hash);
      if (section && section.offsetTop <= window.scrollY + offset) {
        currentSection = link;
      }
    });

    return currentSection;
  }

  function getHeaderHeight() {
    if (isMobileNavLayout()) {
      return getMobileTopBarHeight();
    }

    var header = document.querySelector('.site-header');
    return header ? header.offsetHeight : 0;
  }

  function isMobileNavLayout() {
    return navToggle && window.getComputedStyle(navToggle).display !== 'none';
  }

  function getMobileTopBarHeight() {
    var nav = document.querySelector('.nav');
    if (!nav) return 0;

    var brand = document.querySelector('.brand');
    var navToggleHeight = navToggle ? navToggle.getBoundingClientRect().height : 0;
    var brandHeight = brand ? brand.getBoundingClientRect().height : 0;
    var navStyle = window.getComputedStyle(nav);
    var paddingTop = parseFloat(navStyle.paddingTop) || 0;
    var paddingBottom = parseFloat(navStyle.paddingBottom) || 0;

    return Math.ceil(paddingTop + Math.max(brandHeight, navToggleHeight) + paddingBottom);
  }

  function getHomeStackGap() {
    var homeStack = document.querySelector('.home-stack');
    if (!homeStack) return 0;

    var gapValue = window.getComputedStyle(homeStack).gap || window.getComputedStyle(homeStack).rowGap || '0px';
    var gap = parseFloat(gapValue);
    return Number.isFinite(gap) ? gap : 0;
  }

  function scrollToHashTarget(hash) {
    if (!hash) return;

    var target = document.querySelector(hash);
    if (!target) return;

    var top = target.getBoundingClientRect().top + window.pageYOffset - getHomeStackGap() - getHeaderHeight();
    window.scrollTo({
      top: Math.max(0, Math.round(top)),
      behavior: 'auto'
    });
  }

  function setMenuOpen(open) {
    if (!siteHeader || !navToggle) return;

    siteHeader.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function updateActiveLink() {
    var currentPage = pageName(window.location.pathname);

    if (currentPage === 'index.html') {
      var hashMatch = window.location.hash && findLink(function (_, target) {
        return target.page === 'index.html' && target.hash === window.location.hash;
      });

      setActive(activeAnchorLink() || hashMatch || findLink(function (_, target) {
        return target.page === 'index.html' && !target.hash;
      }));
      return;
    }

    setActive(findLink(function (_, target) {
      return target.page === currentPage && !target.hash;
    }));
  }

  updateActiveLink();
  window.addEventListener('hashchange', function () {
    updateActiveLink();
    scrollToHashTarget(window.location.hash);
  });
  window.addEventListener('scroll', updateActiveLink, { passive: true });
  window.addEventListener('resize', function () {
    if (window.location.hash) {
      scrollToHashTarget(window.location.hash);
    }
    if (window.innerWidth > 680) {
      closeMenu();
    }
  });
  window.addEventListener('load', function () {
    scrollToHashTarget(window.location.hash);
    updateActiveLink();
  });

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      setMenuOpen(!siteHeader.classList.contains('nav-open'));
    });
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function (event) {
      var target = linkTarget(link);
      var currentPage = pageName(window.location.pathname);

      if (currentPage !== 'index.html' || target.page !== 'index.html' || !target.hash) {
        return;
      }

      event.preventDefault();
      history.pushState(null, '', target.hash);
      scrollToHashTarget(target.hash);
      updateActiveLink();
      closeMenu();
    });
  });
}());
