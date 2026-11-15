import { TestBed } from '@angular/core/testing';
import { CardCollapsible } from './card-collapsible';

describe('CardCollapsible', () => {
  it('does not allow content overflow by default', () => {
    const fixture = TestBed.createComponent(CardCollapsible);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.card-collapsible.allow-overflow')).toBeNull();
  });

  it('adds the allow-overflow class when allowOverflow is true', () => {
    const fixture = TestBed.createComponent(CardCollapsible);
    fixture.componentRef.setInput('allowOverflow', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.card-collapsible.allow-overflow')).not.toBeNull();
  });
});
