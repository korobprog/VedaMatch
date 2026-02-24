# Portal Blueprints API

## Authentication
All endpoints below are protected and require `Authorization: Bearer <token>`.

## GET `/api/system/portal-blueprint/:role`
Returns a role blueprint used by the mobile portal.

### Response
```json
{
  "blueprint": {
    "role": "devotee",
    "title": "Преданный",
    "description": "Максимальный духовный профиль с акцентом на севу, ятры и общину.",
    "highlightColor": "#F97316",
    "quickAccess": ["travel", "seva", "news"],
    "heroServices": ["seva", "travel", "charity", "news"],
    "servicesHint": [
      {
        "serviceId": "seva",
        "title": "Сева",
        "filters": ["projects", "donation_flow"]
      }
    ],
    "mathFilters": [
      {
        "mathId": "gauranga",
        "mathName": "Gauranga Org.",
        "filters": ["prasadam", "family_events", "kirtan"]
      }
    ]
  }
}
```

## GET `/api/system/god-mode-math-filters`
Returns the global list of math filters for God Mode UI.

### Response
```json
{
  "mathFilters": [
    {
      "mathId": "gauranga",
      "mathName": "Gauranga Org.",
      "filters": ["prasadam", "family_events", "kirtan"]
    },
    {
      "mathId": "scsm",
      "mathName": "Шри Чайтанья Сарасват Орг. (SCSM)",
      "filters": ["education", "lectures", "satsang"]
    },
    {
      "mathId": "pure-bhakti-yoga",
      "mathName": "Международное Общество Чистой Бхакти-йоги",
      "filters": ["bhakti", "community", "retreats"]
    },
    {
      "mathId": "sri-gopinath-gaudiya",
      "mathName": "Шри Гопинатх Гаудия",
      "filters": ["kirtan", "seva", "family_events"]
    },
    {
      "mathId": "sri-chaitanya-math",
      "mathName": "Шри Чайтанья Орг.",
      "filters": ["prasadam", "festivals", "seva"]
    }
  ]
}
```
