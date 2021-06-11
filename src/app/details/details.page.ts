import { SocketioService} from '../service/socketio.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MIPlug } from '../model/miplug';

@Component({
  selector: 'app-details',
  templateUrl: './details.page.html',
  styleUrls: ['./details.page.scss'],
})
export class DetailsPage implements OnInit {

  // 当前插座信息
  miPlug: MIPlug;

  // 插座状态信息
  miPlugData = {
    channel0: false,
    energyConsumed: 0.0,
    loadPower: 0.0
  };

  ledImg: string;

  constructor(private socketioService: SocketioService, private activatedRouter: ActivatedRoute) {
    this.socketioService.getMIPlugControlChange().subscribe((data: any) => {
      this.miPlugData.channel0 = data.channel0;
      this.miPlugData.energyConsumed = data.energyConsumed;
      this.miPlugData.loadPower = data.loadPower;
      this.imgSwitch();
    });
    this.activatedRouter.params.subscribe((miPlug: MIPlug) => {
      this.miPlug = miPlug;
    });
  }

  ngOnInit() {
  }

  /**
   * 切换开关时的图片
   */
  imgSwitch() {
    if (this.miPlugData.channel0) {
      this.ledImg = './assets/img/plug_on.png';
    }else {
      this.ledImg = './assets/img/plug_off.png';
    }
  }

  /**
   * 控制插座开关
   */
  miPlugControl() {
    this.socketioService.getSocket().emit('miplug-control', {channel0: !this.miPlugData.channel0});
  }


}
