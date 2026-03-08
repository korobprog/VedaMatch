package database

import (
	"encoding/json"
	"log"
	"rag-agent-server/internal/models"
	"strings"
)

func SeedDhamaPlaces() {
	if DB == nil {
		return
	}

	var count int64
	if err := DB.Model(&models.HolyPlace{}).Count(&count).Error; err != nil {
		log.Printf("[DhamaSeed] count failed: %v", err)
		return
	}
	if count > 0 {
		return
	}

	samples := []models.HolyPlace{
		{
			Slug:               "vrindavan",
			Status:             models.HolyPlaceStatusPublished,
			SortOrder:          10,
			IsFeatured:         true,
			TitleRu:            "Вриндаван",
			TitleEn:            "Vrindavan",
			TitleHi:            "वृंदावन",
			ShortDescriptionRu: "Священный город Кришны с храмами, парикрамой и атмосферой паломничества.",
			ShortDescriptionEn: "Sacred city of Krishna with temples, parikrama routes, and a living pilgrimage atmosphere.",
			ShortDescriptionHi: "कृष्ण की पवित्र नगरी, मंदिरों, परिक्रमा मार्गों और जीवंत तीर्थ वातावरण के साथ।",
			DescriptionRu:      "Вриндаван — один из главных центров вайшнавского паломничества в Индии. Здесь находятся древние и современные храмы, места лил Кришны и важные маршруты для парикрамы.",
			DescriptionEn:      "Vrindavan is one of the key Vaishnava pilgrimage centers in India, known for ancient and modern temples, Krishna-lila sites, and important parikrama routes.",
			DescriptionHi:      "वृंदावन भारत के प्रमुख वैष्णव तीर्थों में से एक है, जहाँ प्राचीन और आधुनिक मंदिर, कृष्ण-लीला स्थल और महत्वपूर्ण परिक्रमा मार्ग स्थित हैं।",
			VisitRulesRu:       "Одевайтесь скромно, уважайте храмовый порядок, заранее уточняйте правила фото и входа.",
			VisitRulesEn:       "Dress modestly, follow temple etiquette, and confirm photography and entry rules in advance.",
			VisitRulesHi:       "सादगी से वस्त्र पहनें, मंदिर शिष्टाचार का पालन करें और फोटो व प्रवेश नियम पहले से जान लें।",
			EtiquetteRu:        "Не шуметь в алтарных залах, не мешать даршан-очередям, соблюдать чистоту.",
			EtiquetteEn:        "Avoid noise inside temple halls, do not disrupt darshan lines, and keep the space clean.",
			EtiquetteHi:        "मंदिर प्रांगण में शोर न करें, दर्शन पंक्ति में बाधा न डालें और स्वच्छता रखें।",
			PilgrimageTipsRu:   "Лучше приезжать рано утром, выделить время на парикраму и даршаны в главных храмах.",
			PilgrimageTipsEn:   "Arrive early, reserve time for parikrama, and plan darshan visits to the main temples.",
			PilgrimageTipsHi:   "सुबह जल्दी पहुँचें, परिक्रमा के लिए समय रखें और मुख्य मंदिरों के दर्शन की योजना बनाएं।",
			PracticesRu:        "Джапа во время прогулок, чтение о лилах места, участие в киртане и слушание лекций.",
			PracticesEn:        "Japa during walks, reading about the site’s lilas, joining kirtan, and listening to lectures.",
			PracticesHi:        "प्रदक्षिणा के दौरान जप, स्थल की लीलाओं का अध्ययन, कीर्तन और प्रवचन श्रवण।",
			FAQRu:              "Лучшее время для посещения — прохладный сезон. Для храмов и ашрамов заранее уточняйте дресс-код.",
			FAQEn:              "The cooler season is best for visiting. Confirm dress code requirements before entering temples or ashrams.",
			FAQHi:              "दर्शन के लिए ठंडा मौसम बेहतर है। मंदिर या आश्रम में प्रवेश से पहले ड्रेस कोड जान लें।",
			PlaceType:          "temple_city",
			Tradition:          "gaudiya_vaishnava",
			City:               "Vrindavan",
			State:              "Uttar Pradesh",
			Country:            "India",
			Latitude:           27.5804,
			Longitude:          77.7020,
			BestSeason:         "October to March",
			BestTime:           "Early morning and sunset",
			HeroImageURL:       "/uploads/travel/vrindavan.jpg",
		},
		{
			Slug:               "mayapur",
			Status:             models.HolyPlaceStatusPublished,
			SortOrder:          20,
			IsFeatured:         true,
			TitleRu:            "Маяпур",
			TitleEn:            "Mayapur",
			TitleHi:            "मायापुर",
			ShortDescriptionRu: "Святое место Шри Чайтаньи Махапрабху и важный центр гаудия-вайшнавской традиции.",
			ShortDescriptionEn: "Sacred birthplace region of Sri Chaitanya Mahaprabhu and a major center of the Gaudiya Vaishnava tradition.",
			ShortDescriptionHi: "श्री चैतन्य महाप्रभु की पवित्र लीला-भूमि और गौड़ीय वैष्णव परंपरा का प्रमुख केंद्र।",
			DescriptionRu:      "Маяпур привлекает паломников храмами, фестивалями и местами, связанными с явлением Шри Чайтаньи. Здесь часто проходят международные программы и ятры.",
			DescriptionEn:      "Mayapur attracts pilgrims with its temples, festivals, and sites connected with the appearance of Sri Chaitanya. It is a major hub for international yatras and programs.",
			DescriptionHi:      "मायापुर अपने मंदिरों, उत्सवों और श्री चैतन्य महाप्रभु से जुड़े स्थलों के कारण तीर्थयात्रियों को आकर्षित करता है।",
			VisitRulesRu:       "Соблюдайте график храмов и фестивалей, учитывайте сезон дождей и большие очереди на праздники.",
			VisitRulesEn:       "Respect temple and festival schedules, and prepare for the rainy season and large festival crowds.",
			VisitRulesHi:       "मंदिर और उत्सव के समय का सम्मान करें, वर्षा ऋतु और बड़े उत्सवों की भीड़ का ध्यान रखें।",
			EtiquetteRu:        "Оставайтесь внимательными к программе храма, очередям на прасад и правилам общих пространств.",
			EtiquetteEn:        "Stay attentive to temple programs, prasadam queues, and shared-space discipline.",
			EtiquetteHi:        "मंदिर कार्यक्रम, प्रसाद पंक्ति और सामूहिक स्थानों के नियमों का ध्यान रखें।",
			PilgrimageTipsRu:   "Планируйте поездку вокруг фестивального календаря и резервируйте жилье заранее.",
			PilgrimageTipsEn:   "Plan around the festival calendar and reserve accommodation in advance.",
			PilgrimageTipsHi:   "उत्सव कैलेंडर के अनुसार योजना बनाएं और आवास पहले से बुक करें।",
			PracticesRu:        "Посещение самадхи, киртан, нама-хатта, лекции и парикрама по Навадвипе.",
			PracticesEn:        "Visit samadhi sites, join kirtan, attend lectures, and do Navadvip parikrama.",
			PracticesHi:        "समाधि स्थलों के दर्शन, कीर्तन, प्रवचन और नवद्वीप परिक्रमा।",
			FAQRu:              "В период Гаура-пурнимы поток паломников резко возрастает, поэтому логистику лучше продумать заранее.",
			FAQEn:              "Pilgrim traffic rises sharply around Gaura Purnima, so plan logistics well in advance.",
			FAQHi:              "गौर पूर्णिमा के आसपास तीर्थयात्रियों की संख्या बहुत बढ़ती है, इसलिए व्यवस्था पहले करें।",
			PlaceType:          "holy_town",
			Tradition:          "gaudiya_vaishnava",
			City:               "Mayapur",
			State:              "West Bengal",
			Country:            "India",
			Latitude:           23.4236,
			Longitude:          88.3882,
			BestSeason:         "November to February",
			BestTime:           "Morning temple program",
			HeroImageURL:       "/uploads/travel/mayapur.jpg",
		},
	}

	for i := range samples {
		galleryItems := []string{samples[i].HeroImageURL}
		payload, err := json.Marshal(galleryItems)
		if err == nil {
			samples[i].GalleryJSON = string(payload)
		} else {
			samples[i].GalleryJSON = "[]"
		}
		if strings.TrimSpace(samples[i].Country) == "" {
			samples[i].Country = "India"
		}
		if err := DB.Create(&samples[i]).Error; err != nil {
			log.Printf("[DhamaSeed] create failed slug=%s err=%v", samples[i].Slug, err)
		}
	}
}

func SeedDhamaCollections() {
	if DB == nil {
		return
	}

	var count int64
	if err := DB.Model(&models.DhamaCollection{}).Count(&count).Error; err != nil {
		log.Printf("[DhamaSeed] collection count failed: %v", err)
		return
	}
	if count > 0 {
		return
	}

	var places []models.HolyPlace
	if err := DB.Where("slug IN ?", []string{"vrindavan", "mayapur"}).Find(&places).Error; err != nil {
		log.Printf("[DhamaSeed] place lookup for collections failed: %v", err)
		return
	}
	placeBySlug := make(map[string]models.HolyPlace, len(places))
	for _, place := range places {
		placeBySlug[place.Slug] = place
	}

	type collectionSeed struct {
		Collection models.DhamaCollection
		PlaceSlugs []string
	}

	seeds := []collectionSeed{
		{
			Collection: models.DhamaCollection{
				Slug:          "krishna-lila-heartland",
				Status:        models.DhamaCollectionStatusPublished,
				SortOrder:     10,
				IsFeatured:    true,
				TitleRu:       "Сердце Кришна-лилы",
				TitleEn:       "Heartland of Krishna-lila",
				TitleHi:       "कृष्ण-लीला का हृदय-क्षेत्र",
				DescriptionRu: "Подборка мест для первого глубокого знакомства с лилами Кришны и атмосферой традиционного паломничества.",
				DescriptionEn: "A starting collection for discovering Krishna-lila places and the atmosphere of traditional pilgrimage.",
				DescriptionHi: "कृष्ण-लीला स्थलों और पारंपरिक तीर्थ वातावरण से परिचय के लिए प्रारंभिक संग्रह।",
				HeroImageURL:  "/uploads/travel/vrindavan.jpg",
			},
			PlaceSlugs: []string{"vrindavan"},
		},
		{
			Collection: models.DhamaCollection{
				Slug:          "gaudiya-pilgrimage-axis",
				Status:        models.DhamaCollectionStatusPublished,
				SortOrder:     20,
				IsFeatured:    true,
				TitleRu:       "Главные места гаудия-паломничества",
				TitleEn:       "Core Gaudiya pilgrimage places",
				TitleHi:       "गौड़ीय तीर्थ के प्रमुख स्थल",
				DescriptionRu: "Ключевые святые места для паломника, который хочет пройти по главным центрам гаудия-вайшнавской традиции.",
				DescriptionEn: "Essential sacred places for pilgrims following the main centers of the Gaudiya Vaishnava tradition.",
				DescriptionHi: "गौड़ीय वैष्णव परंपरा के मुख्य तीर्थ-केंद्रों को जोड़ने वाला आवश्यक संग्रह।",
				HeroImageURL:  "/uploads/travel/mayapur.jpg",
			},
			PlaceSlugs: []string{"mayapur", "vrindavan"},
		},
	}

	for _, seed := range seeds {
		collection := seed.Collection
		if err := DB.Create(&collection).Error; err != nil {
			log.Printf("[DhamaSeed] collection create failed slug=%s err=%v", collection.Slug, err)
			continue
		}
		for idx, placeSlug := range seed.PlaceSlugs {
			place, ok := placeBySlug[placeSlug]
			if !ok {
				log.Printf("[DhamaSeed] collection place missing collection=%s place=%s", collection.Slug, placeSlug)
				continue
			}
			link := models.DhamaCollectionPlaceLink{
				CollectionID: collection.ID,
				HolyPlaceID:  place.ID,
				SortOrder:    idx,
			}
			if err := DB.Create(&link).Error; err != nil {
				log.Printf("[DhamaSeed] collection link create failed collection=%s place=%s err=%v", collection.Slug, placeSlug, err)
			}
		}
	}
}
