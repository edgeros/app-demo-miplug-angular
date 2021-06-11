import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import * as io from 'socket.io-client';
import { BehaviorSubject } from 'rxjs';
import { MIPlug } from '../model/miplug';
import { NavController } from '@ionic/angular';
import { edger } from '@edgeros/web-sdk';

@Injectable({
  providedIn: 'root',
})
export class SocketioService {

  /**
   * 定义socketio客户端对象  
   */
  private socket: SocketIOClient.Socket;


  /**
   * 包含用户token和srand数据  
   */
  private payload: any;

  /**
   * http头 
   */
  private headers = new HttpHeaders({});

  /**
   * 设备列表，可观察对象
   */
  private miPlugMapChange = new BehaviorSubject<Map<string, MIPlug>>(
    new Map<string, MIPlug>()
  );

  /**
   * 设备灯的状态，可观察对象
   */
  private miPlugControlChange = new BehaviorSubject<object>({});

  /**
   * 设备列表
   */
  private miPlugMap = new Map<string, MIPlug>();

  /**
   * 当前插座
   */
  private thisMIPlug: MIPlug;

  /**
   * 设备灯的状态
   */
  private miPlugControl = {
    channel0: false,
    energyConsumed: 0.0,
    loadPower: 0.0,
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private nav: NavController
  ) {
    edger.onAction('token', (data: any) => {
      if (!data) {
        edger.notify.error('请先登录！');
      }
      this.payload = data;
    });

    edger.token().then((data: any) => {
      console.log(data);
      if (!data) {
        edger.notify.error('请先登录！');
      }
      this.payload = data;
      this.socket = io({
        path: '/miplug',
        query: {
          'edger-token': this.payload.token,
          'edger-srand': this.payload.srand,
        },
      });
      this.initSocket();
    });
  }

  /**
   * 返回一个socketio连接
   */
  getSocket() {
    return this.socket;
  }

  /**
   * 初始化socketio的监听事件
   */
  initSocket() {
    this.socket.on('reconnect_attempt', (attempt) => {
      this.socket.io.opts.query = {
        'edger-token': this.payload.token,
        'edger-srand': this.payload.srand,
      };
    });
    this.socket.on('connect_error', (error) => {
      console.log(`连接错误！`);
    });
    this.socket.on('connect_timeout', (timeout) => {
      console.log(`连接超时！`);
    });
    this.socket.on('error', (error) => {
      console.log(`发生错误！`);
    });
    this.socket.on('connect', () => {
      this.getMIPlugList();
    });
    this.socket.on('disconnect', () => { });
    this.socket.on('miplug-lost', (devid) => {
      edger.notify.error(
        `${this.miPlugMap.get(devid).alias} 设备已下线！`
      );
      this.miPlugMap.delete(devid);
      this.miPlugMapChange.next(this.miPlugMap);
      if (
        this.thisMIPlug.devid === devid &&
        this.router.url.includes('details')
      ) {
        this.nav.back();
      }
    });
    this.socket.on('miplug-join', (devobj: MIPlug) => {
      if (!this.miPlugMap.has(devobj.devid)) {
        this.miPlugMap.set(devobj.devid, devobj);
        this.miPlugMapChange.next(this.miPlugMap);
        edger.notify.success(`新上线了 ${devobj.alias} 设备！`);
      }
    });

    this.socket.on('miplug-error', (error) => {
      if (error.code === 50002) {
        edger.notify.error(`无效设备！`);
      } else {
        edger.notify.error(error.message);
      }
    });
    this.socket.on('miplug-message', (msg) => {
      if (typeof msg.channel0 !== 'undefined') {
        this.miPlugControl.channel0 = msg.channel0;
      }
      if (typeof msg.energyConsumed !== 'undefined') {
        this.miPlugControl.energyConsumed = msg.energyConsumed;
      }
      if (typeof msg.loadPower !== 'undefined') {
        this.miPlugControl.loadPower = msg.loadPower;
      }
      this.miPlugControlChange.next(this.miPlugControl);
    });
  }

  /**
   * 获取设备列表
   */
  getMIPlugList() {
    this.socket.emit('miplug-list', (data: MIPlug[]) => {
      this.miPlugMap.clear();
      if (data.length === 0) {
        edger.notify.info(`暂无设备！`);
      } else {
        data.forEach((value) => {
          this.miPlugMap.set(value.devid, value);
        });
      }
      this.miPlugMapChange.next(this.miPlugMap);
    });
  }

  /**
   * 进入设备详情页
   * @param miPlug
   */
  getMIPlugDetail(miPlug: MIPlug) {
    this.http
      .post('/api/select/' + miPlug.devid, null, {
        headers: this.getHttpHeaders(),
      })
      .subscribe(
        (res: any) => {
          if (res.result) {
            this.thisMIPlug = miPlug;
            this.router.navigate(['/details', miPlug]);
          } else {
            if (res.code === 50004) {
              edger.notify.error('您没有此设备权限！');
            } else {
              edger.notify.error('未知错误！');
            }
          }
        },
        (error) => {
          console.log(error);
        }
      );
  }

  /**
   * 获取设备列表可观察对象
   */
  getMiPlugMapChange() {
    return this.miPlugMapChange;
  }

  /**
   * 获取小米插座状态可观察对象
   */
  getMIPlugControlChange() {
    return this.miPlugControlChange;
  }

  getPayload(): any {
    return this.payload;
  }

  getHttpHeaders() {
    this.headers = this.headers.set('edger-token', this.payload.token);
    this.headers = this.headers.set('edger-srand', this.payload.srand);
    return this.headers;
  }
}
