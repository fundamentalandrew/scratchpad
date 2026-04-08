Vectors creates HTML creative units which we need to activate in Google Campaign Manager. We need to be able to:

- Upload a new HTML creative unit to Google Campaign Manager.
- Create a new campaign in Google Campaign Manager or link to an existing campaign.
- Assign the creative unit to the campaign.
- Create a new placement in the campaign.
- Create a new ad in the placement.

We already have a system in place that can create campaigns, assign creatives, create placements, and create ads. We need to add to this system the ability to upload the new HTML creative units and then tie this system into the vectors system.

So the Vectors system will need to know:
- booking CA (show exisintg activty / placements on booking, can only be linked to onw campaign, can't create new)
  - group bookings
- advertiserId (profileId and accountId come from this, clients have a list of advertisers) if one use it, if multi ask
- optionally select exisiting campaign
- campaign start and end dates (worked out from booking details)
- campaign name
- locate default creative ID for each size
  - create default creative with blank image and google link if not existing
- generate backup image for each size
- placement name (worked out from booking details, some clients have their own naming conventions)
- siteId (this comes from the booking, TSF has a link, but can generate multiple links)
- placement start and end dates (can be same as campaign start and end dates)
- placement testing start date is 3 days before the placement start date
- ad name (check TSF for naming conventions)
- ad exit URL
  - position of our CA macro codes (normally end of utm_content but some clients have their own naming conventions)
  - clients other utm requests for this campaign

UTM builder examples:
- [MFS](https://fundamentalmedia.sharepoint.com/:x:/r/md/cl/_layouts/15/Doc.aspx?sourcedoc=%7B31206EE8-34EE-40AC-A232-2DFF15033E09%7D&file=MFS%20UTM%20Creator_FM_BOX_v2.xlsx&action=default&mobileredirect=true)
- [Terminus](https://www.terminusapp.com/utm-builder/)
- [BG](https://docs.google.com/spreadsheets/d/1jIlTWIY_IH132Du8xACHcoJs6hk7dDfma_roI9bCjYo/edit?gid=1298124804#gid=1298124804)
- [Osin](https://fundamentalmedia-my.sharepoint.com/:u:/p/geraldine_hogben/IQBI-pIg2jVdRbP6NwIlxCBFATpsNk1BfAcewTmQtmn4-T4?e=i2DKZC)

To get from TSF:
- campaign name structure
- placement name structure
- ad name structure
- placement / campaign start and end date rules
- placement testing start days and rules


Connections:
- The creative ID is added to the vectors system, linking the generated creative content (headlines, etc) to the creative ID, creatives can be linked to multiple creative IDs.
- Require an OA report for the launch in July

UI:
- Activation screen first asks user to enter the booking CA.
- Activation screen gives user ability to create or select exisiting campaigns, minimum 1 campaign is required.
- They then have all the creatives showing and selected and can click to assign the campaigns to the selected creatives. They can also de-select creatives and assign some creatives to different campaigns.
- User also has to select the siteId if more then one link between booking media name and site exist.
- User needs to enter custom UTM details for ad URL's.
- User can then click to activate the campaign in Google Campaign Manager.

- Ability to add child group bookings to existing booking
- Consider keeping records with UUID's for each record we send to Google Campaign Manager, so we can track and link to them.

This system works by using the dc_job table and sending in params like so:

type: campaign
```json
{
  "name": "Triodos - Impact Investing - Institutional - Pan-Europe - FY2026",
  "endDate": "31/12/2026",
  "accountId": "1384779",
  "profileId": "6114358",
  "startDate": "12/03/2026",
  "advertiserId": "10434859",
  "campaignUuid": "2D25F051-563D-A34B-A7A9-A2BA29EED538",
  "defaultLandingPageUrl": "https://www.google.com",
  "defaultLandingPageName": "https://www.google.com"
}
```
type: creative (for assigning)
```json
{
  "creatives": [
    {
      "accountId": "1409377",
      "profileId": "6018165",
      "campaignId": "33089337",
      "creativeId": "236739241",
      "AdsJoinUuid": "8AF69710-A9BE-3448-9868-4E593E232CC8",
      "creativeType": "AdsJoinStandard"
    },
    {
      "accountId": "1409377",
      "profileId": "6018165",
      "campaignId": "33089337",
      "creativeId": "141874485",
      "AdsJoinUuid": "3E9A9523-43D7-4B4D-900A-5B4B74D540AB",
      "creativeType": "AdsJoinDefault"
    }
  ]
}
```

type: placement
```json
{
  "placements": [
    {
      "name": "Professional Adviser_ROS blended sidebars/billboards + contextually targeted to 'Multi Asset'_970x250_26/01/2026_31/03/2026_Equities_Intermediary_6 for 26_Active_970 x 250-Ad Bundle",
      "siteId": "7014448",
      "endDate": "31/03/2026",
      "accountId": "1384779",
      "profileId": "6114358",
      "sizeWidth": "970",
      "startDate": "23/01/2026",
      "campaignId": "34742272",
      "sizeHeight": "250",
      "tagFormats": "PLACEMENT_TAG_JAVASCRIPT,PLACEMENT_TAG_INTERSTITIAL_IFRAME_JAVASCRIPT,PLACEMENT_TAG_INTERSTITIAL_INTERNAL_REDIRECT,PLACEMENT_TAG_INTERSTITIAL_JAVASCRIPT,PLACEMENT_TAG_INSTREAM_VIDEO_PREFETCH,PLACEMENT_TAG_INSTREAM_VIDEO_PREFETCH_VAST_3,PLACEMENT_TAG_INSTREAM_VIDEO_PREFETCH_VAST_4",
      "pricingType": "PRICING_TYPE_CPM",
      "compatibility": "DISPLAY",
      "paymentSource": "PLACEMENT_AGENCY_PAID",
      "placementUuid": "E80251E4-07AD-5746-AEE7-7F5EE306092B",
      "directorySiteId": "0",
      "testingStartDate": "19/01/2026"
    }
  ]
}
```

type: ad
```json
{
  "ads": [
    {
      "name": "Cautious Managed_970 x 250_Trustnet_Home page takeover promoting CMF._970x250_23/03/2026__Equities_Advisory_CMF_Active_BB",
      "type": "AD_SERVING_STANDARD_AD",
      "endTime": "2026-03-23 23:59:59",
      "accountId": "1384779",
      "profileId": "6114358",
      "startTime": "2026-03-20 00:00:00",
      "TsfAdsUuid": "026DA4C5-F04C-DD4C-A6A6-60B400DA181B",
      "campaignId": "34811822",
      "creativeId": [
        "246932244"
      ],
      "placementId": "440281897",
      "advertiserId": "10365086",
      "creativeExitUrls": [
        {
          "id": "98782479",
          "adsId": "026DA4C5-F04C-DD4C-A6A6-60B400DA181B",
          "adsJoinId": "34A4486C-03CA-2E4A-8EAB-02070B001B07",
          "creativeId": "246932244",
          "advertiserCustomEventId": "7895296",
          "overrideCustomClickThroughUrl": "https://www.bailliegifford.com/en/uk/intermediaries/funds/cautious-managed-fund/?utm_medium=display&utm_source=trustnet&utm_campaign=oeics&utm_content=cautiousmanagedfund__CA50179970-%epid!-%ecid!__&dtag-%n="
        }
      ],
      "creativeWeightedRotationPercentage": [
        "100"
      ]
    },
    {
      "name": "Default Advert",
      "type": "AD_SERVING_DEFAULT_AD",
      "endTime": "2026-03-23 23:59:59",
      "accountId": "1384779",
      "profileId": "6114358",
      "startTime": "2026-03-20 00:00:00",
      "TsfAdsUuid": "852FC339-EEDE-B54D-9347-DBC3C3C3502F",
      "campaignId": "34811822",
      "creativeId": "147666839",
      "placementId": "440281897",
      "advertiserId": "10365086",
      "creativeExitUrls": [
        {
          "id": "dummy_fm_cturl",
          "adsId": "852FC339-EEDE-B54D-9347-DBC3C3C3502F",
          "adsJoinId": "DA644A92-86F4-B94A-B526-F29D8D532A6C",
          "creativeId": "147666839",
          "advertiserCustomEventId": "dummy_fm_cturl",
          "overrideCustomClickThroughUrl": ""
        }
      ],
      "creativeWeightedRotationPercentage": 10
    },
    {
      "name": "Cautious Managed_300x600_Trustnet_Home page takeover promoting CMF._300x600_23/03/2026__Equities_Advisory_CMF_Active_HP",
      "type": "AD_SERVING_STANDARD_AD",
      "endTime": "2026-03-23 23:59:59",
      "accountId": "1384779",
      "profileId": "6114358",
      "startTime": "2026-03-20 00:00:00",
      "TsfAdsUuid": "5E3CCECD-4DCD-794A-91D5-76F1D1D1318B",
      "campaignId": "34811822",
      "creativeId": [
        "246326134"
      ],
      "placementId": "440282101",
      "advertiserId": "10365086",
      "creativeExitUrls": [
        {
          "id": "98818691",
          "adsId": "5E3CCECD-4DCD-794A-91D5-76F1D1D1318B",
          "adsJoinId": "8D059A2D-E63C-3843-9885-7246D7096661",
          "creativeId": "246326134",
          "advertiserCustomEventId": "7895296",
          "overrideCustomClickThroughUrl": "https://www.bailliegifford.com/en/uk/intermediaries/funds/cautious-managed-fund/?utm_medium=display&utm_source=trustnet&utm_campaign=oeics&utm_content=cautiousmanagedfund__CA50179970-%epid!-%ecid!__&dtag-%n="
        }
      ],
      "creativeWeightedRotationPercentage": [
        "100"
      ]
    },
    {
      "name": "Default Advert",
      "type": "AD_SERVING_DEFAULT_AD",
      "endTime": "2026-03-23 23:59:59",
      "accountId": "1384779",
      "profileId": "6114358",
      "startTime": "2026-03-20 00:00:00",
      "TsfAdsUuid": "C3923D32-460F-C04D-A72C-EB11FA71D5AC",
      "campaignId": "34811822",
      "creativeId": "147666830",
      "placementId": "440282101",
      "advertiserId": "10365086",
      "creativeExitUrls": [
        {
          "id": "dummy_fm_cturl",
          "adsId": "C3923D32-460F-C04D-A72C-EB11FA71D5AC",
          "adsJoinId": "31F53606-761D-F148-8DCA-EACDD2E84D8C",
          "creativeId": "147666830",
          "advertiserCustomEventId": "dummy_fm_cturl",
          "overrideCustomClickThroughUrl": ""
        }
      ],
      "creativeWeightedRotationPercentage": 10
    },
    {
      "name": "Cautious Managed_300 x 250_Trustnet_Home page takeover promoting CMF._300x250_23/03/2026__Equities_Advisory_CMF_Active_MPU",
      "type": "AD_SERVING_STANDARD_AD",
      "endTime": "2026-03-23 23:59:59",
      "accountId": "1384779",
      "profileId": "6114358",
      "startTime": "2026-03-20 00:00:00",
      "TsfAdsUuid": "C09A6233-B8A8-D64A-B71D-AC9A0BF32A70",
      "campaignId": "34811822",
      "creativeId": [
        "246324913"
      ],
      "placementId": "440281900",
      "advertiserId": "10365086",
      "creativeExitUrls": [
        {
          "id": "98832385",
          "adsId": "C09A6233-B8A8-D64A-B71D-AC9A0BF32A70",
          "adsJoinId": "D0F49AAE-AC19-3342-B8EC-CD7B8874CD5D",
          "creativeId": "246324913",
          "advertiserCustomEventId": "7895296",
          "overrideCustomClickThroughUrl": "https://www.bailliegifford.com/en/uk/intermediaries/funds/cautious-managed-fund/?utm_medium=display&utm_source=trustnet&utm_campaign=oeics&utm_content=cautiousmanagedfund__CA50179970-%epid!-%ecid!__&dtag-%n="
        }
      ],
      "creativeWeightedRotationPercentage": [
        "100"
      ]
    },
    {
      "name": "Default Advert",
      "type": "AD_SERVING_DEFAULT_AD",
      "endTime": "2026-03-23 23:59:59",
      "accountId": "1384779",
      "profileId": "6114358",
      "startTime": "2026-03-20 00:00:00",
      "TsfAdsUuid": "09FA2E33-5A1F-5244-8A8D-9B91DA9FE507",
      "campaignId": "34811822",
      "creativeId": "147666836",
      "placementId": "440281900",
      "advertiserId": "10365086",
      "creativeExitUrls": [],
      "creativeWeightedRotationPercentage": 10
    }
  ]
}
```