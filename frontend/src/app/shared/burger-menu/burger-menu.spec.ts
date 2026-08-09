import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { BurgerMenu } from './burger-menu';
import { BurgerMenuItem } from './burger-menu.model';

describe('BurgerMenu', () => {
  let component: BurgerMenu;
  let fixture: ComponentFixture<BurgerMenu>;
  let overlayContainer: OverlayContainer;
  let overlayContainerElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BurgerMenu],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(BurgerMenu);
    component = fixture.componentInstance;
    overlayContainer = TestBed.inject(OverlayContainer);
    overlayContainerElement = overlayContainer.getContainerElement();
    await fixture.whenStable();
  });

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });

  // The mat-menu panel is rendered lazily into the CDK overlay container (appended to
  // <body>), not into the component's own template, so it only exists once the trigger
  // has actually been clicked. `app-button-icon`'s template root is a plain `<div
  // (click)>`, not a native `<button>` — clicking it still opens the menu because the
  // click bubbles up to the `app-button-icon` host element, where `matMenuTriggerFor`'s
  // host listener is declared.
  function openMenu(): void {
    const trigger: HTMLElement = fixture.nativeElement.querySelector('.button-icon');
    trigger.click();
    fixture.detectChanges();
  }

  function menuItemButtons(): HTMLButtonElement[] {
    return Array.from(overlayContainerElement.querySelectorAll('button.menu-item'));
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('orderedMenuItem', () => {
    it('sorts items by ascending order', () => {
      const items: BurgerMenuItem[] = [
        { order: 2, icon: 'b', name: 'B', clickKey: 'ABOUT', disabled: false, hidden: false },
        { order: 1, icon: 'a', name: 'A', clickKey: 'GITHUB', disabled: false, hidden: false },
        { order: 3, icon: 'c', name: 'C', clickKey: 'PWA', disabled: false, hidden: false },
      ];
      fixture.componentRef.setInput('menuItem', items);

      expect(component.orderedMenuItem().map((item) => item.name)).toEqual(['A', 'B', 'C']);
    });

    it('filters out hidden items', () => {
      const items: BurgerMenuItem[] = [
        { order: 1, icon: 'a', name: 'A', clickKey: 'GITHUB', disabled: false, hidden: false },
        { order: 2, icon: 'b', name: 'B', clickKey: 'ABOUT', disabled: false, hidden: true },
      ];
      fixture.componentRef.setInput('menuItem', items);

      expect(component.orderedMenuItem().map((item) => item.name)).toEqual(['A']);
    });
  });

  describe('menu interaction', () => {
    it('emits menuClick with the clicked item clickKey', () => {
      const items: BurgerMenuItem[] = [
        {
          order: 1,
          icon: 'info',
          name: 'A propos',
          clickKey: 'ABOUT',
          disabled: false,
          hidden: false,
        },
      ];
      fixture.componentRef.setInput('menuItem', items);

      const emitted: string[] = [];
      component.menuClick.subscribe((key) => emitted.push(key));

      openMenu();
      menuItemButtons()[0].click();

      expect(emitted).toEqual(['ABOUT']);
    });

    it('disables the button for a disabled item', () => {
      const items: BurgerMenuItem[] = [
        {
          order: 1,
          icon: 'info',
          name: 'A propos',
          clickKey: 'ABOUT',
          disabled: true,
          hidden: false,
        },
      ];
      fixture.componentRef.setInput('menuItem', items);

      openMenu();

      expect(menuItemButtons()[0].disabled).toBe(true);
    });

    it('renders an <img> for an assets-path icon and <app-icon> for a named icon', () => {
      const items: BurgerMenuItem[] = [
        {
          order: 1,
          icon: 'assets/images/github.svg',
          name: 'GitHub',
          clickKey: 'GITHUB',
          disabled: false,
          hidden: false,
        },
        {
          order: 2,
          icon: 'info',
          name: 'A propos',
          clickKey: 'ABOUT',
          disabled: false,
          hidden: false,
        },
      ];
      fixture.componentRef.setInput('menuItem', items);

      openMenu();
      const buttons = menuItemButtons();

      expect(buttons[0].querySelector('img')).not.toBeNull();
      expect(buttons[0].querySelector('app-icon')).toBeNull();
      expect(buttons[1].querySelector('app-icon')).not.toBeNull();
      expect(buttons[1].querySelector('img')).toBeNull();
    });

    it('shows the empty state when there are no visible items', () => {
      fixture.componentRef.setInput('menuItem', []);

      openMenu();

      expect(overlayContainerElement.textContent).toContain('Aucune option disponible');
      expect(menuItemButtons().length).toBe(0);
    });
  });
});
