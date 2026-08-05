import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-title-and-description',
  imports: [NgOptimizedImage],
  templateUrl: './title-and-description.html',
  styleUrl: './title-and-description.scss',
})
export class TitleAndDescription {}
