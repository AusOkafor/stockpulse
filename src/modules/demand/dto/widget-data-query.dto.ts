import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class WidgetDataQueryDto {
  @IsString()
  @IsNotEmpty()
  shop: string;

  @IsString()
  @IsNotEmpty()
  variantId: string;

  @IsString()
  @IsOptional()
  hmac?: string;

  @IsString()
  @IsOptional()
  signature?: string;
}

