import { ElementRef, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SpyTarget } from './spy-target.model';
import { WindowService } from './window.service';

@Injectable({
  providedIn: 'root'
})
export class ScrollSpyService {
  private stopSpying$ = new Subject();
  private activeSpyTarget$ = new Subject<string>();
  private scrollEvent: Observable<Event>;
  private resizeEvent: Observable<Event>;
  private spyTargets: SpyTarget[] = [];

  constructor(private windowService: WindowService) {
      this.scrollEvent = this.windowService.scrollEvent.pipe(takeUntil(this.stopSpying$));
      this.resizeEvent = this.windowService.resizeEvent.pipe(takeUntil(this.stopSpying$));
  }

  spy() {
      this.scrollEvent.subscribe(() => this.checkActiveElement());
      this.resizeEvent.subscribe(() => this.checkActiveElement());

      this.checkActiveElement();
  }

  addTarget(target: SpyTarget) {
    this.spyTargets.push(target);
    this.checkActiveElement();
  }

  removeTarget(target: string) {
    const index = this.spyTargets.findIndex(spyTarget => target === spyTarget.name);

    if (index >= 0) {
      this.spyTargets.splice(index, 1);
      this.checkActiveElement();
    }
  }

  checkActiveElement() {
    for (const target of this.spyTargets) {
      if (this.isElementActive(target.element)) {
        this.activeSpyTarget$.next(target.name);
      }
    }
  }

  isElementActive(element: ElementRef) {
    const targetOffsetTop = this.windowService.getElementOffsetTop(element);
    const targetHeight = this.windowService.getElementHeight(element);
    const scrollTop = this.windowService.scrollTop;
    const viewportHeight = this.windowService.viewportHeight;

    // target bottom edge is below window top edge && target top edge is above window bottom edge
    return targetOffsetTop + targetHeight >= scrollTop && targetOffsetTop <= scrollTop + viewportHeight;
  }

  get activeSpyTarget() {
    return this.activeSpyTarget$.asObservable();
  }

  stopSpying() {
    this.activeSpyTarget$.complete();
    this.stopSpying$.next();
    this.spyTargets = [];
  }
}