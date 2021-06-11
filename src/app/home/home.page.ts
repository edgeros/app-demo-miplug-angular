import { SocketioService} from '../service/socketio.service';
import { Component } from '@angular/core';
import { MIPlug } from '../model/miplug';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  // 设备列表
  miPlugMap = new Map<string, MIPlug>();

  constructor(private socketioService: SocketioService) {
    this.socketioService.getMiPlugMapChange().subscribe((data: Map<string, MIPlug>) => {
      this.miPlugMap = data;
    });
  }

  /**
   * 进入插座设备详情页
   * @param miPlug 
   */
  getDetailsPage(miPlug: MIPlug) {
    this.socketioService.getMIPlugDetail(miPlug);
  }

  doRefresh(event) {
    setTimeout(() => {
      this.socketioService.getMIPlugList();
      event.target.complete();
    }, 1000);
  }

}
