import { Component, OnInit } from '@angular/core';
import { SpyOnDirective } from 'ng-spy';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.css'],
    standalone: true,
    imports: [SpyOnDirective]
})
export class NavbarComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
