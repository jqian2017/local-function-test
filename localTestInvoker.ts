import applySfFxMiddleware from './sfmiddleware';
import { buildCloudevent } from './localPayload';
import {Logger, LoggerLevel } from '@salesforce/core';

async function constructLocal(customPayload: string): Promise<Array<any>>{
    const ce = await buildCloudevent(customPayload, undefined, true);
    const input = {
        payload: Object.assign({}, ce.spec.payload),
        headers: {}
      };
  
      const level =  LoggerLevel.INFO;
      const logger = new Logger('Evergreen Logger');
      logger.addStream({stream: process.stderr});
      logger.setLevel(level);
      logger.addField('request_id', 'requestIDJing');
  
      const middlewareResult = [ce, logger];
  
      return applySfFxMiddleware(input, {}, middlewareResult);  
}

export {constructLocal}