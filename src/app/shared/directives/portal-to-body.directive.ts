import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/**
 * Moves the host element to <body> so fixed-position overlays (modals, backdrops)
 * cover the whole viewport instead of being trapped by layout stacking contexts.
 */
@Directive({
  selector: '[appPortalToBody]',
  standalone: true
})
export class PortalToBodyDirective implements OnInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  ngOnInit(): void {
    this.document.body.appendChild(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.host.nativeElement.remove();
  }
}
