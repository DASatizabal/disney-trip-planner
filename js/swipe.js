const Swipe = {
  _startX: 0,
  _startY: 0,
  _threshold: 50,
  _container: null,

  init(containerId) {
    this._container = document.getElementById(containerId);
    if (!this._container) return;

    this._container.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: true });
    this._container.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: true });

    // Update active dot on scroll
    this._container.addEventListener('scroll', () => this._onScroll(), { passive: true });
  },

  _onTouchStart(e) {
    // Ignore touches that begin on a draggable element or the divider — those
    // are pointer-driven interactions handled by Planner.
    if (e.target.closest && e.target.closest('.split-divider-draggable, .meal-slot-filled, .timeline-event')) {
      this._suppress = true;
      return;
    }
    this._suppress = false;
    const touch = e.touches[0];
    this._startX = touch.clientX;
    this._startY = touch.clientY;
  },

  _onTouchEnd(e) {
    if (this._suppress) { this._suppress = false; return; }
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this._startX;
    const deltaY = touch.clientY - this._startY;

    // Only trigger swipe if horizontal movement dominates
    if (Math.abs(deltaX) > this._threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        Planner.goToDay(Planner._activeDayIndex + 1);
      } else {
        Planner.goToDay(Planner._activeDayIndex - 1);
      }
    }
  },

  _onScroll() {
    if (!this._container || window.innerWidth > 768) return;

    const scrollLeft = this._container.scrollLeft;
    const colWidth = this._container.offsetWidth;
    const newIndex = Math.round(scrollLeft / colWidth);

    if (newIndex !== Planner._activeDayIndex && newIndex >= 0 && newIndex < TRIP_DAYS.length) {
      Planner._activeDayIndex = newIndex;
      Planner._renderDots();
    }
  }
};
