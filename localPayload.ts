import {Config, Connection, Org} from '@salesforce/core'
// @ts-ignore: no typedefs for cloudevents-sdk
import * as Cloudevent from 'cloudevents-sdk'
import * as v03 from 'cloudevents-sdk/v03'

async function buildCloudevent(userdata: string, targetusername: string | undefined, structured: boolean): Cloudevent {
    let requestId: string = "uuid()"

    // attempt to parse the input userdata as json string
    let parsedData: object | string
    try {
      parsedData = JSON.parse(userdata)
      // tslint:disable-next-line:no-unused
    } catch (e) {
      parsedData = userdata
    }

    // buildSfdxData for the cloudEvent
    parsedData = await buildSfdxData(targetusername, parsedData, requestId)

    // StructuredHTTPEmitter and BinaryHTTPEmitter expects cloudEvent data differently
    const dataObj = structured ? parsedData : {data: parsedData}
    return new Cloudevent(v03.Spec)
      .id(requestId)
      .source('urn:event:from:local')
      .type('com.evergreen.functions.test')
      .subject('test-subject')
      .schemaurl('https://devcenter.heroku.com')
      .dataContentType('application/json; charset=utf-8')
      .data(dataObj)
      .time(new Date())
}


async function buildSfdxData(targetusername: string | undefined, userdata: object | string, requestId: string): Promise<object> {
    try {
      // auth to scratch org using targetusername
      const org: Org = await Org.create({
        aliasOrUsername: targetusername
      })

      const aliasOrUser = targetusername || `defaultusername ${org.getConfigAggregator().getInfo(Config.DEFAULT_USERNAME).value}`
      console.log(`Using ${aliasOrUser} login credential to initialize context`)

      // refresh to get the access Token
      await org.refreshAuth()

      const orgusername = org.getUsername()
      const orgId15 = org.getOrgId().slice(0, 15)
      const connection: Connection = org.getConnection()

      const userContext = {
        salesforceBaseUrl: connection.instanceUrl,
        orgId: orgId15,
        orgDomainUrl: connection.instanceUrl,
        username: orgusername || '',
        userId: connection.getAuthInfoFields().userId || '',     // userId may not be set
        onBehalfOfUserId: ''    // onBehalfOfUserId not set
      }

      const context = {
        apiVersion: connection.version,
        payloadVersion: 'invoke-v0.1',
        userContext
      }

      const sfContext = {
        accessToken: connection.accessToken,
        requestId
      }

      let sfdxData = {
        context,
        payload: userdata,
        sfContext
      }

      return sfdxData
    } catch (err) {
      if (err.name === 'AuthInfoCreationError' || err.name === 'NoUsername') {
        console.warn('No -u username or defaultusername found, context will be partially initialized')
        return {payload: userdata}
      }
      throw err
    }
}

export {buildCloudevent}