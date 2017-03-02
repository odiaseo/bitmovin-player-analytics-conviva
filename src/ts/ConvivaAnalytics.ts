///<reference path="Conviva.d.ts"/>
import {Html5Time} from './Html5Time';
import {Html5Timer} from './Html5Timer';
import {Html5Http} from './Html5Http';
import {Html5Storage} from './Html5Storage';
import {Html5Metadata} from './Html5Metadata';
import {Html5Logging} from './Html5Logging';

export declare type Player = any; // TODO use player API type definitions once available

export interface ConvivaAnalyticsConfiguration {
  /**
   * The TOUCHSTONE_SERVICE_URL for testing with Touchstone. Only to be used for development, must not be set in
   * production or automated testing.
   */
  gatewayUrl?: string;
}

export interface EventAttributes {
  [key: string]: string;
}

export class ConvivaAnalytics {

  private player: Player;
  private systemFactory: Conviva.SystemFactory;
  private client: Conviva.Client;
  private playerStateManager: Conviva.PlayerStateManager;

  private logger: Conviva.LoggingInterface;
  private sessionKey: number = Conviva.Client.NO_SESSION_KEY;

  constructor(player: Player, customerKey: string, config: ConvivaAnalyticsConfiguration = {}) {
    this.player = player;

    this.logger = new Html5Logging();

    let systemInterface = new Conviva.SystemInterface(
      new Html5Time(),
      new Html5Timer(),
      new Html5Http(),
      new Html5Storage(),
      new Html5Metadata(),
      this.logger
    );

    let systemSettings = new Conviva.SystemSettings();
    this.systemFactory = new Conviva.SystemFactory(systemInterface, systemSettings);

    let clientSettings = new Conviva.ClientSettings(customerKey);

    if (config.gatewayUrl) {
      clientSettings.gatewayUrl = config.gatewayUrl;
    }

    this.client = new Conviva.Client(clientSettings, this.systemFactory);

    this.playerStateManager = this.client.getPlayerStateManager();

    // The video stream is stalled and waiting for more video data.
    this.playerStateManager.setPlayerState(Conviva.PlayerStateManager.PlayerState.BUFFERING);

    // We are now streaming at a bitrate of 2.2Mbps.
    this.playerStateManager.setBitrateKbps(2200); // in Kbps

    // There was an error with video playback, and the video player reported an error code of 'INVALID_MANIFEST'.
    // Due to the severity of the error, this will most likely prevent playback and should be considered as fatal.
    this.playerStateManager.sendError('INVALID_MANIFEST', Conviva.Client.ErrorSeverity.FATAL);

    // Duration of the video stream was detected. It is 30000 milliseconds.
    this.playerStateManager.setDuration(30); // in seconds

    // Encoded frame rate of the video stream was detected. It is 29 frames per second.
    this.playerStateManager.setEncodedFrameRate(29);

    // The name of the video player was not available until an instance of it was created.
    // We now know it is 'AdvancedVideoPlayer'.
    this.playerStateManager.setPlayerType('Bitmovin Player');

    // The version of the video player was not available until an instance of it was created.
    // We now know it is '1.2.3.4'.
    this.playerStateManager.setPlayerVersion('1.2.3.4.5');


    // Create a ContentMetadata object and supply relevant metadata for the requested content.
    let contentMetadata = new Conviva.ContentMetadata();
    contentMetadata.assetName = 'Sample Video';
    // more...

    // Create a Conviva monitoring session.
    this.sessionKey = this.client.createSession(contentMetadata);

    if (this.sessionKey !== Conviva.Client.NO_SESSION_KEY) {
      // Success.
    } else {
      // Something went wrong. With stable system interfaces, this should never happen.
    }


    // sessionKey was obtained as shown above
    this.client.attachPlayer(this.sessionKey, this.playerStateManager);

    // sessionKey was obtained as shown above
    this.client.detachPlayer(this.sessionKey);

    // If you no longer need that PlayerStateManager, release it
    this.client.releasePlayerStateManager(this.playerStateManager);

    // Terminate the existing Conviva monitoring session represented by sessionKey
    this.client.cleanupSession(this.sessionKey);
  }

  /**
   * Sends a custom application-level event to Conviva's Player Insight. An application-level event can always
   * be sent and is not tied to a specific video.
   * @param eventName arbitrary event name
   * @param eventAttributes a string-to-string dictionary object with arbitrary attribute keys and values
   */
  sendCustomApplicationEvent(eventName: string, eventAttributes: EventAttributes = {}): void {
    this.client.sendCustomEvent(Conviva.Client.NO_SESSION_KEY, eventName, eventAttributes);
  }

  /**
   * Sends a custom playback-level event to Conviva's Player Insight. A playback-level event can only be sent
   * during an active video session.
   * @param eventName arbitrary event name
   * @param eventAttributes a string-to-string dictionary object with arbitrary attribute keys and values
   */
  sendCustomPlaybackEvent(eventName: string, eventAttributes: EventAttributes = {}): void {
    // Check for active session
    if (this.sessionKey == Conviva.Client.NO_SESSION_KEY) {
      this.logger.consoleLog('cannot send playback event, no active monitoring session',
        Conviva.SystemSettings.LogLevel.WARNING);
      return;
    }

    this.client.sendCustomEvent(this.sessionKey, eventName, eventAttributes);
  }

  release(): void {
    this.client.release();
    this.systemFactory.release();
  }
}