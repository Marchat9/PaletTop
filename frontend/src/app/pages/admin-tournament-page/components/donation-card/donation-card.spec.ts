import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
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
  it('invites the organiser to support PaletTop', () => {
    const text = setup().nativeElement.textContent;

    expect(text).toContain("Votre tournoi s'est bien passé ?");
    expect(text).toContain('PaletTop est gratuit, sans publicité et développé bénévolement.');
    expect(text).toContain('Soutenir PaletTop via PayPal');
  });

  it('links to the donation page, opened in a new tab', () => {
    const link = setup().nativeElement.querySelector('a.donate-link') as HTMLAnchorElement | null;

    expect(link?.getAttribute('href')).toBe(DONATION_URL);
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
    expect(link?.textContent).toContain('Soutenir PaletTop via PayPal');
  });
});
