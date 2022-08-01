import {
  Controller,
  Inject,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as AWS from 'aws-sdk';
import { CONFIG_OPTIONS } from 'src/common/common.constants';

@Controller('uploads')
export class UploadsController {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: UploadsModuleOptions,
  ) {}

  @Post('')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file) {
    AWS.config.update({
      credentials: {
        accessKeyId: this.options.ACCESS_KEY,
        secretAccessKey: this.options.SECRET_KEY,
      },
    });
    try {
      const objectKey = `${Date.now() + file.originalname}`;
      await new AWS.S3()
        .putObject({
          Bucket: process.env.BUCKET,
          Body: file.buffer,
          Key: objectKey,
          ACL: 'public-read',
        })
        .promise();
      const url = `https://${this.options.BUCKET}.s3.amazonaws.com/${objectKey}`;
      return { url };
    } catch {
      return null;
    }
  }
}
