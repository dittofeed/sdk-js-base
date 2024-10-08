import { BatchQueue, ClearTimeout, SetTimeout } from "./batchQueue";

export * from "./batchQueue";

export enum EventType {
  Identify = "identify",
  Track = "track",
  Page = "page",
  Screen = "screen",
}

export type AppDataContext = Record<string, any>;

export interface BaseAppData {
  messageId?: string;
  timestamp?: string;
}

export interface BaseIdentifyData extends BaseAppData {
  context?: AppDataContext;
  traits?: Record<string, any>;
}

export interface BaseBatchIdentifyData extends BaseAppData {
  type: EventType.Identify;
  traits?: Record<string, any>;
}

export interface KnownIdentifyData extends BaseIdentifyData {
  userId: string;
}

export interface AnonymousIdentifyData extends BaseIdentifyData {
  userId: string;
}

export type IdentifyData = KnownIdentifyData | AnonymousIdentifyData;

export interface BatchIdentifyDataWithUserId extends BaseBatchIdentifyData {
  userId: string;
}

export interface BatchIdentifyDataWithAnonymousId
  extends BaseBatchIdentifyData {
  anonymousId: string;
}

export type BatchIdentifyData =
  | BatchIdentifyDataWithUserId
  | BatchIdentifyDataWithAnonymousId;

export interface BaseTrackData extends BaseAppData {
  context?: AppDataContext;
  event: string;
  properties?: Record<string, any>;
}

export interface BaseBatchTrackData extends BaseAppData {
  type: EventType.Track;
  event: string;
  properties?: Record<string, any>;
}

export interface KnownTrackData extends BaseTrackData {
  userId: string;
}

export interface AnonymousTrackData extends BaseTrackData {
  anonymousId: string;
}

export type TrackData = KnownTrackData | AnonymousTrackData;

export interface BatchTrackDataWithUserId extends BaseBatchTrackData {
  userId: string;
}

export interface BatchTrackDataWithAnonymousId extends BaseBatchTrackData {
  anonymousId: string;
}

export type BatchTrackData =
  | BatchTrackDataWithUserId
  | BatchTrackDataWithAnonymousId;

export interface BasePageData extends BaseAppData {
  context?: AppDataContext;
  name?: string;
  properties?: Record<string, any>;
}

export interface BaseBatchPageData extends BaseAppData {
  type: EventType.Page;
  name?: string;
  properties?: Record<string, any>;
}

export interface KnownPageData extends BasePageData {
  userId: string;
}

export interface AnonymousPageData extends BasePageData {
  anonymousId: string;
}

export type PageData = KnownPageData | AnonymousPageData;

export interface BatchPageDataWithUserId extends BaseBatchPageData {
  userId: string;
}

export interface BatchPageDataWithAnonymousId extends BaseBatchPageData {
  anonymousId: string;
}

export type BatchPageData =
  | BatchPageDataWithUserId
  | BatchPageDataWithAnonymousId;

export interface BaseScreenData extends BaseAppData {
  context?: AppDataContext;
  name?: string;
  properties?: Record<string, any>;
}

export interface BaseBatchScreenData extends BaseAppData {
  type: EventType.Screen;
  name?: string;
  properties?: Record<string, any>;
}

export interface KnownScreenData extends BaseScreenData {
  userId: string;
}

export interface AnonymousScreenData extends BaseScreenData {
  anonymousId: string;
}

export type ScreenData = KnownScreenData | AnonymousScreenData;

export interface BatchScreenDataWithUserId extends BaseBatchScreenData {
  userId: string;
}

export interface BatchScreenDataWithAnonymousId extends BaseBatchScreenData {
  anonymousId: string;
}

export type BatchScreenData =
  | BatchScreenDataWithUserId
  | BatchScreenDataWithAnonymousId;

export type BatchItem =
  | BatchIdentifyData
  | BatchTrackData
  | BatchPageData
  | BatchScreenData;

export interface BatchAppData {
  batch: BatchItem[];
  context?: AppDataContext;
}

export interface InitParamsDataBase {
  writeKey: string;
  host?: string;
}

export interface InitParamsEnvBase<T> {
  uuid: () => string;
  setTimeout: SetTimeout<T>;
  clearTimeout: ClearTimeout<T>;
  issueRequest: (
    data: BatchAppData,
    params: InitParamsDataBase
  ) => Promise<void>;
  baseDelay?: number;
  retries?: number;
}

export interface InitParamsBase<T>
  extends InitParamsDataBase,
    InitParamsEnvBase<T> {}

/**
 * Dittofeed SDK base class providing shared functionality for all js SDKs while
 * abstracting away environment specific functionality.
 */
export class DittofeedSdkBase<T> {
  private batchQueue: BatchQueue<BatchItem, T>;
  private uuid: () => string;

  constructor({
    issueRequest,
    writeKey,
    host = "https://app.dittofeed.com",
    uuid,
    setTimeout,
    clearTimeout,
    baseDelay,
    retries,
  }: InitParamsBase<T>) {
    this.batchQueue = new BatchQueue<BatchItem, ReturnType<typeof setTimeout>>({
      timeout: 500,
      batchSize: 5,
      setTimeout,
      clearTimeout,
      baseDelay,
      retries,
      executeBatch: async (batch) => {
        const data: BatchAppData = {
          batch,
        };
        await issueRequest(data, { writeKey, host });
      },
    });
    this.uuid = uuid;
  }

  public identify(params: IdentifyData) {
    const data: BatchIdentifyData = {
      messageId: params.messageId ?? this.uuid(),
      type: EventType.Identify,
      ...params,
    };
    this.batchQueue.submit(data);
  }

  public track(params: TrackData) {
    const data: BatchTrackData = {
      messageId: params.messageId ?? this.uuid(),
      type: EventType.Track,
      ...params,
    };
    this.batchQueue.submit(data);
  }

  public page(params: PageData) {
    const data: BatchPageData = {
      messageId: params.messageId ?? this.uuid(),
      type: EventType.Page,
      ...params,
    };
    this.batchQueue.submit(data);
  }

  public screen(params: ScreenData) {
    const data: BatchScreenData = {
      messageId: params.messageId ?? this.uuid(),
      type: EventType.Screen,
      ...params,
    };
    this.batchQueue.submit(data);
  }

  public async flush() {
    await this.batchQueue.flush();
  }
}
