import { createError, defineEventHandler, readBody } from 'h3'
import axios from 'axios'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { accessToken, deviceSn } = body

  try {
    const response = await axios.post('https://globalapi.solarmanpv.com/device/v1.0/currentData', {
        deviceSn 
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    return response.data
  } catch (error) {
    throw createError({
      statusCode: error.response.status,
      statusMessage: error.response.data.message,
    })
  }
})
