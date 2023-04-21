import EventEmitter from 'events'
import { BasicUser, Credentials, Registration } from '../../common/types'
import { register } from '../clients/registration-client'
import AppData from '../repos/app-data'
import { createHash, randomBytes } from 'crypto'
import X3DH from '../security/x3dh'
import { registerExchangeKey } from '../clients/identity-client'

export default class Authentification extends EventEmitter {
	private appData: AppData
	private authenticated: boolean

	constructor(appData: AppData) {
		super()
		this.appData = appData
		this.authenticated = false
	}

	public async register(registration: Registration): Promise<boolean> {
		if (await this.isChallengePresent()) {
			throw Error('A user has already been registered to this device.')
		}

		const basicUser: BasicUser = {
			displayName: registration.username,
			image: registration.image,
		}
		const registeredUser = await register(basicUser)

		const credentials: Credentials = {
			username: registration.username,
			password: registration.password,
		}
		await this.generateChallenge(credentials.password + credentials.username)

		const x3dh = X3DH.init(registeredUser.id, 200)
		await registerExchangeKey(x3dh.getExchangeKeys())

		this.emit('onRegister', registeredUser, credentials, x3dh)
		return await this.login(credentials)
	}

	public async login(credentials: Credentials): Promise<boolean> {
		if (this.authenticated) {
			throw Error('A user is already authenticated. User must first logout.')
		}

		if (!(await this.isChallengePresent())) {
			throw Error('No challenge present. Cannot validated user credentials.')
		}

		this.authenticated = await this.validateChallenge(credentials.password + credentials.username)

		if (!this.authenticated) {
			throw Error('Username or password incorrect.')
		}

		this.emit('onLogin', credentials)

		return this.authenticated
	}

	public logout(): boolean {
		if (!this.authenticated) {
			throw Error('No user authenticated. User must first login.')
		}

		this.authenticated = false

		this.emit('onLogout')

		return this.authenticated
	}

	private async isChallengePresent(): Promise<boolean> {
		return !!(await this.appData.get('auth.challenge'))
	}

	public async isRegistered(): Promise<boolean> {
		return await this.isChallengePresent()
	}

	public isAuthenticated(): boolean {
		return this.authenticated
	}

	private async generateChallenge(identity: string): Promise<void> {
		const salt = randomBytes(16).toString('hex')
		const hash = createHash('SHA256')
			.update(identity + salt)
			.digest('hex')
		await this.appData.set('auth.salt', salt)
		await this.appData.set('auth.challenge', hash)
	}

	private async validateChallenge(identity: string): Promise<boolean> {
		const salt = await this.appData.get('auth.salt')
		const challenge = await this.appData.get('auth.challenge')
		const hash = createHash('SHA256')
			.update(identity + salt)
			.digest('hex')
		return hash === challenge
	}
}
