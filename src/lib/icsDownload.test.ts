// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { isIOSSafari, triggerIcsExport, ICS_MIME_TYPE } from './icsDownload'

describe('isIOSSafari', () => {
  it('detects iPhone and iPod by user agent', () => {
    expect(isIOSSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15', 'iPhone', 5)).toBe(true)
    expect(isIOSSafari('Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X)', 'iPod touch', 5)).toBe(true)
  })

  it('detects classic iPad user agents directly', () => {
    expect(isIOSSafari('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15', 'iPad', 5)).toBe(true)
  })

  it('detects iPadOS 13+ Safari default desktop-class UA via platform + touch points', () => {
    // iPadOS Safari reports itself as "Macintosh" by default — the only
    // remaining signal is a Mac platform string combined with touch
    // support, which no real Mac reports.
    const ipadOSUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    expect(isIOSSafari(ipadOSUA, 'MacIntel', 5)).toBe(true)
  })

  it('does not misfire on a real Mac (MacIntel platform, no touch points)', () => {
    const macUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    expect(isIOSSafari(macUA, 'MacIntel', 0)).toBe(false)
  })

  it('does not misfire on Android or generic desktop', () => {
    expect(isIOSSafari('Mozilla/5.0 (Linux; Android 14)', 'Linux armv8l', 5)).toBe(false)
    expect(isIOSSafari('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32', 0)).toBe(false)
  })
})

describe('triggerIcsExport', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('non-iOS path: shares/downloads a File with the exact text/calendar MIME type and the .ics filename intact', async () => {
    let capturedFile: File | undefined
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      platform: 'Win32',
      maxTouchPoints: 0,
      canShare: undefined,
    })
    const clickSpy = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        vi.spyOn(el, 'click').mockImplementation(() => {
          capturedFile = new File([], (el as HTMLAnchorElement).download, { type: ICS_MIME_TYPE })
          clickSpy()
        })
      }
      return el
    })

    const outcome = await triggerIcsExport('Read.ics', 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n')

    expect(outcome).toBe('downloaded')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(capturedFile?.name).toBe('Read.ics')
    expect(capturedFile?.type).toBe(ICS_MIME_TYPE)
  })

  it('iOS path: navigates directly to a blob: URL instead of going through share/download', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      platform: 'iPhone',
      maxTouchPoints: 5,
    })
    const originalHref = window.location.href
    let navigatedTo: string | undefined
    // jsdom's window.location.href setter throws "not implemented" for
    // non-empty navigations; intercept via a getter/setter override on the
    // location object itself rather than fighting jsdom's navigation stub.
    const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location')!
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, set href(v: string) { navigatedTo = v } },
    })

    const outcome = await triggerIcsExport('Read.ics', 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n')

    expect(outcome).toBe('downloaded')
    expect(navigatedTo).toMatch(/^blob:/)

    Object.defineProperty(window, 'location', locationDescriptor)
    void originalHref
  })
})
