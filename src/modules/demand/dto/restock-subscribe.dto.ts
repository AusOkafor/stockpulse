import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RestockSubscribeDto {
  @IsString()
  @IsNotEmpty()
  shop: string;

  @IsString()
  @IsNotEmpty()
  variantId: string;

  @IsString()
  @IsNotEmpty()
  contact: string;

  @IsString()
  @IsNotEmpty()
  channel: string;

  @IsString()
  @IsOptional()
  hmac?: string;

  @IsString()
  @IsOptional()
  signature?: string;
}

