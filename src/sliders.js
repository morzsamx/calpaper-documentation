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

    image.addEventListener('click', close);
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
    var visibleCount = 1;
    var pageStarts = [];
    var pageCount = 1;
    var cloneCount = 0;
    var pendingSnapPage = null;
    var renderedSlides = [];
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
    var isPointerTracking = false;

    if (!track || !viewport) return;

    var originalSlides = Array.prototype.slice.call(track.querySelectorAll('.theme-thumb'));
    if (!originalSlides.length) return;

    function openImagePreview(image) {
      if (!image) return;

      stopAutoplay();
      lightbox.open(image.currentSrc || image.src, image.alt, startAutoplay);
    }

    function bindLightbox() {
      renderedSlides.forEach(function (slide) {
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

    function isInteractiveTarget(target) {
      return !!(target && target.closest && target.closest('button, a, input, select, textarea'));
    }

    function getPageStartIndexes(slideCount, countVisible) {
      var starts = [];
      var maxStart = Math.max(0, slideCount - countVisible);
      var start;
      var index;

      for (index = 0; index < slideCount; index += countVisible) {
        start = Math.min(index, maxStart);

        if (!starts.length || starts[starts.length - 1] !== start) {
          starts.push(start);
        }
      }

      if (!starts.length) {
        starts.push(0);
      }

      return starts;
    }

    function syncDots() {
      var index;

      if (!dotsContainer) return;

      dotsContainer.innerHTML = '';

      for (index = 0; index < pageCount; index += 1) {
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

    function updateControls() {
      var shouldShowControls = pageCount > 1;

      if (prevButton) {
        prevButton.hidden = !shouldShowControls;
      }

      if (nextButton) {
        nextButton.hidden = !shouldShowControls;
      }
    }

    function setTrackOffset(offset, immediate) {
      var previousTransition;

      if (!immediate) {
        track.style.transform = 'translateX(-' + offset + 'px)';
        return;
      }

      previousTransition = track.style.transition;
      track.style.transition = 'none';
      track.style.transform = 'translateX(-' + offset + 'px)';
      track.offsetHeight;
      track.style.transition = previousTransition;
    }

    function updateSlideAccessibility(domStartIndex) {
      renderedSlides.forEach(function (slide, index) {
        var isVisible = index >= domStartIndex && index < domStartIndex + visibleCount;
        slide.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
        slide.tabIndex = isVisible ? 0 : -1;
      });
    }

    function getLogicalDomIndex(pageIndex) {
      return cloneCount + pageStarts[pageIndex];
    }

    function setPagePosition(pageIndex, immediate, domStartIndex) {
      var resolvedPage = Math.max(0, Math.min(pageIndex, pageCount - 1));
      var resolvedDomStart = typeof domStartIndex === 'number' ? domStartIndex : getLogicalDomIndex(resolvedPage);
      var targetSlide = renderedSlides[resolvedDomStart];

      currentPage = resolvedPage;
      carousel.style.setProperty('--carousel-visible-count', visibleCount);
      syncDots();
      updateControls();
      updateSlideAccessibility(resolvedDomStart);
      setTrackOffset(targetSlide ? targetSlide.offsetLeft : 0, immediate);
    }

    function buildTrack() {
      var prependClones;
      var appendClones;

      visibleCount = getVisibleCount();
      pageStarts = getPageStartIndexes(originalSlides.length, visibleCount);
      pageCount = pageStarts.length;
      cloneCount = pageCount > 1 ? Math.min(visibleCount, originalSlides.length) : 0;
      pendingSnapPage = null;

      track.innerHTML = '';

      if (cloneCount) {
        prependClones = originalSlides.slice(originalSlides.length - cloneCount).map(function (slide) {
          return slide.cloneNode(true);
        });

        prependClones.forEach(function (slide) {
          track.appendChild(slide);
        });
      }

      originalSlides.forEach(function (slide) {
        track.appendChild(slide);
      });

      if (cloneCount) {
        appendClones = originalSlides.slice(0, cloneCount).map(function (slide) {
          return slide.cloneNode(true);
        });

        appendClones.forEach(function (slide) {
          track.appendChild(slide);
        });
      }

      renderedSlides = Array.prototype.slice.call(track.querySelectorAll('.theme-thumb'));
      currentPage = Math.max(0, Math.min(currentPage, pageCount - 1));
      bindLightbox();
      setPagePosition(currentPage, true);

      if (pageCount < 2) {
        stopAutoplay();
      }
    }

    function goToPage(index) {
      var targetPage;
      var domStartIndex;

      if (pageCount < 2) {
        setPagePosition(0, true);
        return;
      }

      targetPage = ((index % pageCount) + pageCount) % pageCount;
      pendingSnapPage = null;

      if (index < 0) {
        domStartIndex = 0;
        pendingSnapPage = targetPage;
      } else if (index >= pageCount) {
        domStartIndex = cloneCount + originalSlides.length;
        pendingSnapPage = targetPage;
      } else {
        domStartIndex = getLogicalDomIndex(targetPage);
      }

      setPagePosition(targetPage, false, domStartIndex);
    }

    function startAutoplay() {
      if (!autoplayDelay || pageCount < 2) return;

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
      isPointerTracking = false;
      viewport.classList.remove('is-dragging');
    }

    track.addEventListener('transitionend', function (event) {
      var snapPage;

      if (event.target !== track || event.propertyName !== 'transform' || pendingSnapPage === null) {
        return;
      }

      snapPage = pendingSnapPage;
      pendingSnapPage = null;
      setPagePosition(snapPage, true);
    });

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
      if (isInteractiveTarget(event.target)) return;

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
      if (isInteractiveTarget(event.target)) return;

      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      pointerDeltaX = 0;
      pointerDeltaY = 0;
      isPointerTracking = true;
      stopAutoplay();
    });

    viewport.addEventListener('pointermove', function (event) {
      if (!isPointerTracking) return;

      pointerDeltaX = event.clientX - pointerStartX;
      pointerDeltaY = event.clientY - pointerStartY;

      if (Math.abs(pointerDeltaX) > 8) {
        viewport.classList.add('is-dragging');
      }

      if (Math.abs(pointerDeltaX) > Math.abs(pointerDeltaY) && event.cancelable) {
        event.preventDefault();
      }
    });

    viewport.addEventListener('pointerup', function () {
      if (!isPointerTracking) return;

      if (Math.abs(pointerDeltaX) > 60 && Math.abs(pointerDeltaX) > Math.abs(pointerDeltaY)) {
        suppressClickUntil = Date.now() + 400;
        goToPage(pointerDeltaX < 0 ? currentPage + 1 : currentPage - 1);
      }

      resetPointerTracking();
      startAutoplay();
    });

    viewport.addEventListener('pointercancel', function () {
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
    window.addEventListener('resize', function () {
      if (getVisibleCount() !== visibleCount) {
        buildTrack();
        startAutoplay();
      } else {
        setPagePosition(currentPage, true);
      }
    });
    window.addEventListener('load', function () {
      setPagePosition(currentPage, true);
    });

    buildTrack();
    startAutoplay();
  });
}());
