import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer-public',
  imports: [CommonModule],
  templateUrl: './footer-public.html',
  styleUrl: './footer-public.scss'
})
export class FooterPublic {
  currentYear = new Date().getFullYear();
}
