import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from 'src/app/shared/button/button';
import { DonationCard } from './donation-card';

const DONATION_URL = 'https://www.paypal.com/donate/?hosted_button_id=TEST';

function setup() {
  TestBed.configureTestingModule({ imports: [DonationCard] });
  const fixture = TestBed.createComponent(DonationCard);
  fixture.componentRef.setInput('donationUrl', DONATION_URL);
  fixture.detectChanges();
  return fixture;
}

describe('DonationCard', () => {
  afterEach(() => vi.restoreAllMocks());

  it('invites the organiser to support PaletTop', () => {
    const text = setup().nativeElement.textContent;

    expect(text).toContain("Votre tournoi s'est bien passé ?");
    expect(text).toContain('PaletTop est gratuit, sans publicité et développé bénévolement.');
    expect(text).toContain('Soutenir PaletTop');
  });

  it('opens the donation page in a new tab', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const fixture = setup();

    fixture.debugElement
      .query(By.directive(Button))
      .componentInstance.clicked.emit(new Event('click'));

    expect(open).toHaveBeenCalledWith(DONATION_URL, '_blank', 'noopener');
  });
});
