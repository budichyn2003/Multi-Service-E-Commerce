import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

@Controller('api/v1')
export class ProxyController {
  constructor(private readonly proxy: ProxyService) {}

  // Catalog, Cart, Checkout, Admin -> commerce-go
  @All('products*')
  proxyProducts(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, this.proxy.getCommerceUrl());
  }

  @All('categories*')
  proxyCategories(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, this.proxy.getCommerceUrl());
  }

  @All('cart*')
  proxyCart(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, this.proxy.getCommerceUrl());
  }

  @All('checkout*')
  proxyCheckout(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, this.proxy.getCommerceUrl());
  }

  @All('admin*')
  proxyAdmin(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, this.proxy.getCommerceUrl());
  }

  // Orders & Payments -> order-service
  @All('orders*')
  proxyOrders(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, this.proxy.getOrderServiceUrl());
  }

  @All('payments*')
  proxyPayments(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, this.proxy.getOrderServiceUrl());
  }

  // Notifications -> notification-service
  @All('notifications*')
  proxyNotifications(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, this.proxy.getNotificationServiceUrl());
  }

  // AI Assistant -> ai-service
  @All('assistant*')
  proxyAssistant(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res, this.proxy.getAiServiceUrl());
  }
}

