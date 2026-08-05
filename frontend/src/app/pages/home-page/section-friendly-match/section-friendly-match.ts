import { NgOptimizedImage } from '@angular/common';
import { Component, output } from '@angular/core';
import { Button } from 'src/app/shared/button/button';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-section-friendly-match',
  imports: [Card, Button, NgOptimizedImage, Icon],
  templateUrl: './section-friendly-match.html',
  styleUrl: './section-friendly-match.scss',
})
export class SectionFriendlyMatch {
  public readonly eventGoToFriendlyMatch = output<void>();
}
