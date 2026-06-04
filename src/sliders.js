(function () {
  var mobileBreakpoint = window.matchMedia('(max-width: 680px)');
  var carousels = Array.prototype.slice.call(document.querySelectorAll('[data-theme-carousel]'));
  if (!carousels.length) return;

  carousels.forEach(function (carousel) {
    var track = carousel.querySelector('.theme-thumbs');
    var viewport = carousel.querySelector('.theme-carousel-viewport');
    var dotsContainer = carousel.querySelector('.theme-carousel-dots');
    var prevButton = carousel.querySelector('[data-carousel-prev]');
    var nextButton = carousel.querySelector('[data-carousel-next]');
    var desktopVisible = parseInt(carousel.getAttribute('data-carousel-visible'), 10) || 1;
    var mobileVisible = parseInt(carousel.getAttribute('data-carousel-visible-mobile'), 10) || desktopVisible;
    var autoplayDelay = parseInt(carousel.getAttribute('data-carousel-autoplay'), 10);
    var currentPage = 0;
    var autoplayId = null;

    if (!track || !viewport) return;

    var slides = Array.prototype.slice.call(track.querySelectorAll('.theme-thumb'));
    if (!slides.length) return;

    function getVisibleCount() {
      return mobileBreakpoint.matches ? mobileVisible : desktopVisible;
    }

    function getPageCount() {
      return Math.max(1, Math.ceil(slides.length / getVisibleCount()));
    }

    function getStartIndex(pageIndex) {
      return Math.min(pageIndex * getVisibleCount(), Math.max(0, slides.length - 1));
    }

    function syncDots(pageCount) {
      if (!dotsContainer) return;

      dotsContainer.innerHTML = '';

      for (var index = 0; index < pageCount; index += 1) {
        var dot = document.createElement('button');
        var isActive = index === currentPage;

        dot.className = 'theme-carousel-dot' + (isActive ? ' active' : '');
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Show theme ' + (index + 1));
        dot.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        dot.addEventListener('click', createDotHandler(index));

        dotsContainer.appendChild(dot);
      }

      dotsContainer.hidden = pageCount <= 1;
    }

    function createDotHandler(index) {
      return function () {
        goToPage(index);
        startAutoplay();
      };
    }

    function updateControls(pageCount) {
      var shouldShowControls = pageCount > 1;

      if (prevButton) {
        prevButton.hidden = !shouldShowControls;
      }

      if (nextButton) {
        nextButton.hidden = !shouldShowControls;
      }
    }

    function renderSlide() {
      var visibleCount = getVisibleCount();
      var pageCount = getPageCount();
      var startIndex;
      var maxOffset;
      var targetOffset;

      currentPage = Math.max(0, Math.min(currentPage, pageCount - 1));
      carousel.style.setProperty('--carousel-visible-count', visibleCount);

      startIndex = getStartIndex(currentPage);
      maxOffset = Math.max(0, track.scrollWidth - viewport.clientWidth);
      targetOffset = slides[startIndex] ? slides[startIndex].offsetLeft : 0;
      track.style.transform = 'translateX(-' + Math.min(targetOffset, maxOffset) + 'px)';

      slides.forEach(function (slide, index) {
        var isVisible = index >= startIndex && index < startIndex + visibleCount;
        slide.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
        slide.tabIndex = isVisible ? 0 : -1;
      });

      syncDots(pageCount);
      updateControls(pageCount);

      if (pageCount < 2) {
        stopAutoplay();
      }
    }

    function goToPage(index) {
      var pageCount = getPageCount();
      currentPage = (index + pageCount) % pageCount;
      renderSlide();
    }

    function startAutoplay() {
      if (!autoplayDelay || getPageCount() < 2) return;

      stopAutoplay();
      autoplayId = window.setInterval(function () {
        goToPage(currentPage + 1);
      }, autoplayDelay);
    }

    function stopAutoplay() {
      if (autoplayId) {
        window.clearInterval(autoplayId);
        autoplayId = null;
      }
    }

    if (prevButton) {
      prevButton.addEventListener('click', function () {
        goToPage(currentPage - 1);
        startAutoplay();
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', function () {
        goToPage(currentPage + 1);
        startAutoplay();
      });
    }

    viewport.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPage(currentPage - 1);
        startAutoplay();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToPage(currentPage + 1);
        startAutoplay();
      }
    });

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);
    window.addEventListener('resize', renderSlide);
    window.addEventListener('load', renderSlide);

    renderSlide();
    startAutoplay();
  });
}());
