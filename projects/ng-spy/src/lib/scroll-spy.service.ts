import {ElementRef, Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {SpyTarget} from './spy-target.model';
import {WindowService} from './window.service';

@Injectable({
  providedIn: 'root'
})
export class ScrollSpyService {
  private stopSpying$ = new Subject();
  private activeSpyTarget$ = new Subject<string>();
  private scrollEvent: Observable<Event>;
  private resizeEvent: Observable<Event>;
  private spyTargets: SpyTarget[] = [];
  private thresholdTop = 0;
  private thresholdBottom = 0;
  private scrollContainer: ElementRef;
  private isSpying = false;

  constructor(private windowService: WindowService) {
    this.scrollEvent = this.windowService.scrollEvent.pipe(takeUntil(this.stopSpying$));
    this.resizeEvent = this.windowService.resizeEvent.pipe(takeUntil(this.stopSpying$));
  }

  spy({ scrollContainer, thresholdTop = 0, thresholdBottom = 0 }: SpyOptions = {}) {
    // this is to prevent duplicate listeners
    if (this.isSpying) {
      return;
    }

    this.isSpying = true;
    this.scrollContainer = scrollContainer;
    this.thresholdTop = thresholdTop;
    this.thresholdBottom = thresholdBottom;

    this.scrollEvent.subscribe(() => this.checkActiveElement(scrollContainer));
    this.resizeEvent.subscribe(() => this.checkActiveElement(scrollContainer));

    if (scrollContainer != null) {
      this.windowService.getScrollEventForContainer(scrollContainer)
        .pipe(takeUntil(this.stopSpying$))
        .subscribe(() => this.checkActiveElement(scrollContainer));
    }

    this.checkActiveElement(scrollContainer);
  }

  addTarget(target: SpyTarget) {
    this.spyTargets.push({ ...target });
    this.checkActiveElement(this.scrollContainer);
  }

  removeTarget(target: string) {
    this.spyTargets = this.spyTargets.filter(spyTarget => target !== spyTarget.name);
    this.checkActiveElement(this.scrollContainer);
  }

  checkActiveElement(scrollContainer: ElementRef = this.scrollContainer) {
    let activeTarget: SpyTarget = null;
    let scrollContainerOffset = this.getTotalOffset(scrollContainer);

    for (const target of this.spyTargets) {
      const activeElement = activeTarget != null ? activeTarget.element : null;
      if (this.isElementActive(target.element, scrollContainer, scrollContainerOffset, activeElement)) {
        activeTarget = target;
      }
    }

    this.activeSpyTarget$.next(activeTarget ? activeTarget.name : null);
  }

  isElementActive(element: ElementRef, scrollContainer?: ElementRef, scrollContainerOffset?: number, currentActiveElement?: ElementRef) {
    const targetOffsetTop = this.windowService.getElementOffsetTop(element);
    const targetHeight = this.windowService.getElementHeight(element);

    if (currentActiveElement != null && this.windowService.getElementOffsetTop(currentActiveElement) < targetOffsetTop) {
      return false;
    }

    return this.isElementInsideWindow(element, scrollContainer, scrollContainerOffset, targetHeight, targetOffsetTop);
  }

  private getTotalOffset(element: ElementRef): number{
    if(!element){
      return 0;
    }
    let totalOffset = 0;
    let current = element.nativeElement;
    while(current.offsetParent != null){
      totalOffset += current.offsetTop;
      current = current.offsetParent;
    }
    return totalOffset;
  }

  private isElementInsideWindow(element: ElementRef, scrollContainer: ElementRef, scrollContainerOffset: number, elementHeight: number, elementOffsetTop: number) {
    const scrollTop = this.windowService.scrollTop;
    const viewportHeight = this.windowService.viewportHeight;

    // target bottom edge is below window top edge && target top edge is above window bottom edge
    // if target has a container, don't check for thresholds on the window
    if (scrollContainer != null) {
      // element has to be inside the portion of the container that is visible
      const containerHeight = this.windowService.getElementHeight(scrollContainer);
      const containerScrollTop = this.windowService.getElementScrollTop(scrollContainer);
      // < 0: container is "above" the screen
      // > 0: container is on or below the screen
      const distanceToContainer = scrollContainerOffset - scrollTop;
      const visibleContainerHeight = Math.min(viewportHeight - distanceToContainer, containerHeight);
      // < 0: it is too far down to see
      if (visibleContainerHeight < 0){
        return false;
      }
      // elementOffsetTop is a "global" value so we have to calculate the offset _inside_ the container
      const relativeElementOffset = this.getTotalOffset(element);
      // now we need figure out which scrolled _part_ of the container is visible
      return (relativeElementOffset + elementHeight) > (scrollContainerOffset + containerScrollTop)
        && relativeElementOffset < (scrollContainerOffset + containerScrollTop + visibleContainerHeight);
    }

    return elementOffsetTop + elementHeight > scrollTop + this.thresholdTop
      && elementOffsetTop < scrollTop + viewportHeight - this.thresholdBottom;
  }

  get activeSpyTarget() {
    return this.activeSpyTarget$.asObservable();
  }

  stopSpying() {
    this.stopSpying$.next();
    this.spyTargets = [];
    this.isSpying = false;
  }
}

interface SpyOptions {
  scrollContainer?: ElementRef;
  thresholdTop?: number;
  thresholdBottom?: number;
}
