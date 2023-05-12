import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import isDev from 'electron-is-dev'
import { Agent } from 'https'
import { KeyBundle } from '../../common/types/SigalProtocol'

const registerExchangeKeysBaseUrl = process.env.IDENTITY_SERVICE_BASE_URL + '/keys/bundle/'

export async function getKeyBundleForUser(from: string, to: string, token: string): Promise<KeyBundle> {
	try {
		const res = await axios.post(registerExchangeKeysBaseUrl + `${from}/${to}`, null, configure(token))
		return res.data
	} catch (error) {
		if (error instanceof AxiosError) {
			switch (error?.response?.status) {
				case 401:
					throw Error(`Client is not authorised to fetch key bundle.`)
				case 404:
					throw Error(`User not found.`)
				case 500:
					throw Error('Could not fetch key bundle as there was an internal server error.')
				default:
					throw Error('Could not fetch key bundle.')
			}
		} else {
			throw Error('Could not connect to identity services')
		}
	}
}

function configure(token: string): AxiosRequestConfig {
	return {
		headers: { Authorization: `Bearer ${token}` },
		httpsAgent: new Agent({ rejectUnauthorized: !isDev }),
	}
}
