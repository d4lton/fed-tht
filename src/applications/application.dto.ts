import {Type} from "class-transformer";
import {ArrayNotEmpty, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested} from "class-validator";
import {DrinkType, OriginStatus} from "../core";

const DRINK_TYPES: DrinkType[] = ["wine", "distilled-spirits", "malt-beverage"];
const ORIGINS: OriginStatus[] = ["imported", "domestic"];

/** Create an application from its details (images are added separately). */
export class CreateApplicationDto {

  @IsIn(DRINK_TYPES)
    drinkType!: DrinkType;

  @IsString()
  @IsNotEmpty()
    brand!: string;

  @IsString()
  @IsNotEmpty()
    nameAndAddress!: string;

  @IsIn(ORIGINS)
    importedOrDomestic!: OriginStatus;

}

/** Change some of an application's details. Anything omitted is left as-is. */
export class UpdateDetailsDto {

  @IsOptional()
  @IsIn(DRINK_TYPES)
    drinkType?: DrinkType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
    brand?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
    nameAndAddress?: string;

  @IsOptional()
  @IsIn(ORIGINS)
    importedOrDomestic?: OriginStatus;

}

/** One uploaded image: which label, and its bytes (base64) with a media type. */
export class ImageUploadDto {

  @IsString()
  @IsNotEmpty()
    label!: string;

  /** Base64-encoded image bytes. */
  @IsString()
  @IsNotEmpty()
    data!: string;

  @IsString()
  @IsNotEmpty()
    mediaType!: string;

}

/** Replace an application's label images with the given set. */
export class UpdateImagesDto {

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({each: true})
  @Type(() => ImageUploadDto)
    images!: ImageUploadDto[];

}
