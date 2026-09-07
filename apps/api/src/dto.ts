import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsInt,
  IsISO8601,
  IsNumber,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
export class HoldDto {
  @IsString() @Length(1, 100) tripId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(60, { each: true })
  seats!: number[];
}
export class CheckoutDto {
  @IsString() @Length(2, 100) name!: string;
  @IsEmail() @Length(3, 200) email!: string;
  @Matches(/^(?:\+94|0)7\d{8}$/) phone!: string;
  @IsString() @Length(3, 200) address!: string;
  @IsString() @Length(2, 80) city!: string;
}
export class TripDto {
  @IsString() @Length(1, 100) busId!: string;
  @IsString() @Length(1, 100) routeId!: string;
  @IsISO8601() departure!: string;
  @IsInt() @Min(100) @Max(100000) price!: number;
}
export class BusDto {
  @IsString() @Length(2, 100) name!: string;
  @IsString() @Length(3, 30) plate!: string;
  @IsInt() @Min(4) @Max(60) capacity!: number;
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Length(1, 60, { each: true })
  amenities!: string[];
}
export class RouteDto {
  @IsString() @Length(2, 80) from!: string;
  @IsString() @Length(2, 80) to!: string;
  @IsInt() @Min(10) @Max(1440) duration!: number;
  @IsString() @Length(3, 150) boarding!: string;
  @IsString() @Length(3, 150) dropping!: string;
}
export class VerifyDto {
  @IsString() @Length(10, 1000) token!: string;
}
export class LocationDto {
  @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @IsNumber() @Min(-180) @Max(180) longitude!: number;
}

export class CancellationDto {
  @IsString() @Length(5, 500) reason!: string;
}
