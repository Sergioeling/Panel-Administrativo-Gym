import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelAdmin } from './panel-admin';
import { PanelAdminRoutingModule } from './panel-routing-admin.module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule, PanelAdmin, PanelAdminRoutingModule
  ],
  exports:[PanelAdmin, PanelAdminRoutingModule]
})
export class PanelAdminModule { }
