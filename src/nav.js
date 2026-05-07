(function () {
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a:not(.nav-download)'));
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
    var header = document.querySelector('.site-header');
    return header ? header.offsetHeight : 0;
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
  });
  window.addEventListener('load', function () {
    scrollToHashTarget(window.location.hash);
    updateActiveLink();
  });

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
    });
  });
}());
