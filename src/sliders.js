(function () {
  var mobileBreakpoint = window.matchMedia('(max-width: 680px)');
  var carousels = Array.prototype.slice.call(document.querySelectorAll('[data-theme-carousel]'));
  var lightbox = createLightbox();
  if (!carousels.length) return;

  function createLightbox() {
    var overlay = document.createElement('div');
    var content = document.createElement('div');
    var image = document.createElement('img');
    var closeButton = document.createElement('button');
    var resumeAutoplay = null;
    var lastFocusedElement = null;

    overlay.className = 'lightbox';
    overlay.setAttribute('aria-hidden', 'true');

    content.className = 'lightbox-content';

    image.className = 'lightbox-image';
    image.alt = '';

    closeButton.className = 'lightbox-close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close image preview');
    closeButton.innerHTML = '<i class="icon fa fa-times" aria-hidden="true"></i>';

    content.appendChild(closeButton);
    content.appendChild(image);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    function close() {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      image.removeAttribute('src');

      if (resumeAutoplay) {
        resumeAutoplay();
        resumeAutoplay = null;
      }

      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
    }

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        close();
      }
    });

    closeButton.addEventListener('click', close);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && overlay.classList.contains('is-open')) {
        close();
      }
    });

    return {
      open: function (src, alt, onClose) {
        lastFocusedElement = document.activeElement;
        resumeAutoplay = onClose || null;
        image.src = src;
        image.alt = alt || '';
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        closeButton.focus();
      }
    };
  }

  carousels.forEach(function (carousel) {
    var track = carousel.querySelector('.theme-thumbs');
    var viewport = carousel.querySelector('.theme-carousel-viewport');
    var dotsContainer = carousel.querySelector('.theme-carousel-dots');
    var prevButton = carousel.querySelector('[data-carousel-prev]');
    var nextButton = carousel.querySelector('[data-carousel-next]');
    var desktopVisible = parseInt(carousel.getAttribute('data-carousel-visible'), 10) || 1;
    var mobileVisible = parseInt(carousel.getAttribute('data-carousel-visible-mobile'), 10) || desktopVisible;
    var autoplayDelay = parseInt(carousel.getAttribute('data-carousel-autoplay'), 10);
    var pauseOnHover = carousel.getAttribute('data-carousel-pause-on-hover') !== 'false';
    var currentPage = 0;
    var autoplayId = null;
    var suppressClickUntil = 0;
    var touchStartX = 0;
    var touchStartY = 0;
    var touchDeltaX = 0;
    var touchDeltaY = 0;
    var isTouchTracking = false;
    var pointerStartX = 0;
    var pointerStartY = 0;
    var pointerDeltaX = 0;
    var pointerDeltaY = 0;
    var activePointerId = null;
    var isPointerTracking = false;
    var pointerDownImage = null;

    if (!track || !viewport) return;

    var slides = Array.prototype.slice.call(track.querySelectorAll('.theme-thumb'));
    if (!slides.length) return;

    function openImagePreview(image) {
      if (!image) return;

      stopAutoplay();
      lightbox.open(image.currentSrc || image.src, image.alt, startAutoplay);
    }

    function bindLightbox() {
      slides.forEach(function (slide) {
        var image = slide.querySelector('img');
        if (!image || image.dataset.lightboxBound === 'true') return;

        image.dataset.lightboxBound = 'true';
        image.classList.add('lightbox-trigger');
        image.setAttribute('draggable', 'false');
        image.tabIndex = 0;
        image.setAttribute('role', 'button');
        image.setAttribute('aria-label', 'Open larger preview for ' + (image.alt || 'theme'));

        function openImage() {
          if (Date.now() < suppressClickUntil) return;
          openImagePreview(image);
        }

        image.addEventListener('click', openImage);
        image.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openImage();
          }
        });
      });
    }

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

    function resetTouchTracking() {
      touchStartX = 0;
      touchStartY = 0;
      touchDeltaX = 0;
      touchDeltaY = 0;
      isTouchTracking = false;
    }

    function resetPointerTracking() {
      pointerStartX = 0;
      pointerStartY = 0;
      pointerDeltaX = 0;
      pointerDeltaY = 0;
      activePointerId = null;
      isPointerTracking = false;
      pointerDownImage = null;
      viewport.classList.remove('is-dragging');
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

    viewport.addEventListener('touchstart', function (event) {
      if (event.touches.length !== 1) return;

      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
      touchDeltaX = 0;
      touchDeltaY = 0;
      isTouchTracking = true;
      stopAutoplay();
    }, { passive: true });

    viewport.addEventListener('touchmove', function (event) {
      if (!isTouchTracking || event.touches.length !== 1) return;

      touchDeltaX = event.touches[0].clientX - touchStartX;
      touchDeltaY = event.touches[0].clientY - touchStartY;

      if (Math.abs(touchDeltaX) > Math.abs(touchDeltaY) && event.cancelable) {
        event.preventDefault();
      }
    }, { passive: false });

    viewport.addEventListener('touchend', function () {
      if (!isTouchTracking) return;

      if (Math.abs(touchDeltaX) > 50 && Math.abs(touchDeltaX) > Math.abs(touchDeltaY)) {
        suppressClickUntil = Date.now() + 400;
        goToPage(touchDeltaX < 0 ? currentPage + 1 : currentPage - 1);
      }

      resetTouchTracking();
      startAutoplay();
    });

    viewport.addEventListener('touchcancel', function () {
      resetTouchTracking();
      startAutoplay();
    });

    viewport.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      var pointerThumb;

      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      pointerDeltaX = 0;
      pointerDeltaY = 0;
      activePointerId = event.pointerId;
      isPointerTracking = true;
      pointerThumb = event.target.closest ? event.target.closest('.theme-thumb') : null;
      pointerDownImage = pointerThumb ? pointerThumb.querySelector('img') : null;
      stopAutoplay();

      if (viewport.setPointerCapture) {
        viewport.setPointerCapture(event.pointerId);
      }
    });

    viewport.addEventListener('pointermove', function (event) {
      if (!isPointerTracking || event.pointerId !== activePointerId) return;

      pointerDeltaX = event.clientX - pointerStartX;
      pointerDeltaY = event.clientY - pointerStartY;

      if (Math.abs(pointerDeltaX) > 8) {
        viewport.classList.add('is-dragging');
      }

      if (Math.abs(pointerDeltaX) > Math.abs(pointerDeltaY) && event.cancelable) {
        event.preventDefault();
      }
    });

    viewport.addEventListener('pointerup', function (event) {
      if (!isPointerTracking || event.pointerId !== activePointerId) return;

      if (Math.abs(pointerDeltaX) > 60 && Math.abs(pointerDeltaX) > Math.abs(pointerDeltaY)) {
        suppressClickUntil = Date.now() + 400;
        goToPage(pointerDeltaX < 0 ? currentPage + 1 : currentPage - 1);
      } else if (pointerDownImage) {
        suppressClickUntil = Date.now() + 250;
        openImagePreview(pointerDownImage);
      }

      if (viewport.releasePointerCapture && viewport.hasPointerCapture && viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }

      resetPointerTracking();
      startAutoplay();
    });

    viewport.addEventListener('pointercancel', function (event) {
      if (event.pointerId !== activePointerId) return;

      if (viewport.releasePointerCapture && viewport.hasPointerCapture && viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }

      resetPointerTracking();
      startAutoplay();
    });

    viewport.addEventListener('click', function (event) {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    if (pauseOnHover) {
      carousel.addEventListener('mouseenter', stopAutoplay);
      carousel.addEventListener('mouseleave', startAutoplay);
    }

    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);
    window.addEventListener('resize', renderSlide);
    window.addEventListener('load', renderSlide);

    bindLightbox();
    renderSlide();
    startAutoplay();
  });
}());
