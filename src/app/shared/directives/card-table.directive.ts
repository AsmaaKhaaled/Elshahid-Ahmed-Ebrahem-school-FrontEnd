import { AfterViewInit, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/**
 * On phones a list table turns into a stack of cards (styles: `.table-cards` in styles.css),
 * one per row, each cell showing its column's name. This copies every header's text onto the
 * cells of its column as `data-label`, and keeps it up to date as rows come and go.
 *
 *   <table appCardTable class="...">
 */
@Directive({
  selector: 'table[appCardTable]',
  standalone: true,
  host: { class: 'table-cards' }
})
export class CardTableDirective implements AfterViewInit {
  private readonly table = inject<ElementRef<HTMLTableElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    this.label();
    const observer = new MutationObserver(() => this.label());
    observer.observe(this.table, { childList: true, subtree: true, characterData: true });
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  private label(): void {
    const headers = Array.from(this.table.tHead?.rows[0]?.cells ?? [], th => th.textContent?.trim() ?? '');
    for (const body of Array.from(this.table.tBodies)) {
      for (const row of Array.from(body.rows)) {
        Array.from(row.cells).forEach((cell, i) => {
          const label = headers[i] ?? '';
          if (cell.dataset['label'] !== label) cell.dataset['label'] = label;
        });
      }
    }
  }
}
