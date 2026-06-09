export type DayType = 'weekday' | 'weekend' | 'saturday' | 'sunday';

export interface RouteSchedule {
  departuresFromStart: string[];
  departuresFromEnd: string[];
}

export interface BusRoute {
  id: string;
  name: string;
  code: string;
  stops: string[];
  color: string;
  icon: 'bus' | 'graduation-cap' | 'home';
  schedule: {
    weekday: RouteSchedule | null;
    weekend?: RouteSchedule | null;
    saturday?: RouteSchedule | null;
    sunday?: RouteSchedule | null;
  };
}

export const BUS_ROUTES: BusRoute[] = [
  {
    id: 'sehir-ici',
    name: 'Şehir İçi Hattı',
    code: 'Şİ',
    stops: ['Kıranköy', 'Bababurnu', 'Otogar', 'Sadri Artunç Caddesi', 'Çarşı', 'Eski Çarşı'],
    color: '#10B981', // Emerald
    icon: 'bus',
    schedule: {
      weekday: {
        departuresFromStart: [
          '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', 
          '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
          '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', 
          '19:00', '19:30', '20:00', '21:00', '22:00'
        ],
        departuresFromEnd: [
          '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', 
          '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', 
          '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', 
          '19:30', '20:00', '20:30', '21:30', '22:30'
        ]
      },
      weekend: {
        departuresFromStart: [
          '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', 
          '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
        ],
        departuresFromEnd: [
          '08:30', '09:30', '10:30', '11:30', '12:30', '13:30', '14:30', '15:30', 
          '16:30', '17:30', '18:30', '19:30', '20:30', '21:30', '22:30'
        ]
      }
    }
  },
  {
    id: 'safranbolu-karabuk',
    name: 'Safranbolu - Karabük',
    code: 'SK',
    stops: ['Safranbolu Otogar', 'Kıranköy', 'Karabük Yolu', 'Karabük Belediyesi', 'Karabük Merkez'],
    color: '#3B82F6', // Blue
    icon: 'bus',
    schedule: {
      weekday: {
        departuresFromStart: [
          '06:45', '07:15', '07:45', '08:15', '08:45', '09:15', '09:45', '10:15', 
          '10:45', '11:15', '11:45', '12:15', '12:45', '13:15', '13:45', '14:15', 
          '14:45', '15:15', '15:45', '16:15', '16:45', '17:15', '17:45', '18:15', 
          '18:45', '19:15', '19:45', '20:15', '21:15', '22:15'
        ],
        departuresFromEnd: [
          '07:15', '07:45', '08:15', '08:45', '09:15', '09:45', '10:15', '10:45', 
          '11:15', '11:45', '12:15', '12:45', '13:15', '13:45', '14:15', '14:45', 
          '15:15', '15:45', '16:15', '16:45', '17:15', '17:45', '18:15', '18:45', 
          '19:15', '19:45', '20:15', '20:45', '21:45', '22:45'
        ]
      },
      saturday: {
        departuresFromStart: [
          '07:15', '08:15', '09:15', '10:15', '11:15', '12:15', '13:15', '14:15', 
          '15:15', '16:15', '17:15', '18:15', '19:15', '20:15', '21:15', '22:15'
        ],
        departuresFromEnd: [
          '07:45', '08:45', '09:45', '10:45', '11:45', '12:45', '13:45', '14:45', 
          '15:45', '16:45', '17:45', '18:45', '19:45', '20:45', '21:45', '22:45'
        ]
      },
      sunday: {
        departuresFromStart: [
          '08:15', '09:15', '10:15', '11:15', '12:15', '13:15', '14:15', '15:15', 
          '16:15', '17:15', '18:15', '19:15', '20:15', '21:15', '22:15'
        ],
        departuresFromEnd: [
          '08:45', '09:45', '10:45', '11:45', '12:45', '13:45', '14:45', '15:45', 
          '16:45', '17:45', '18:45', '19:45', '20:45', '21:45', '22:45'
        ]
      }
    }
  },
  {
    id: 'safranbolu-bostanbuku',
    name: 'Safranbolu - Bostanbükü',
    code: 'SB',
    stops: ['Kırankoy', 'Aslanlar', 'Bostanbükü Giriş', 'Bostanbükü Köyü'],
    color: '#F59E0B', // Amber
    icon: 'bus',
    schedule: {
      weekday: {
        departuresFromStart: ['07:10', '08:10', '09:10', '11:10', '13:10', '15:10', '16:10', '17:10', '18:10', '19:10'],
        departuresFromEnd: ['07:35', '08:35', '09:35', '11:35', '13:35', '15:35', '16:35', '17:35', '18:35', '19:35']
      },
      weekend: {
        departuresFromStart: ['08:10', '10:10', '12:10', '14:10', '16:10', '18:10'],
        departuresFromEnd: ['08:35', '10:35', '12:35', '14:35', '16:35', '18:35']
      }
    }
  },
  {
    id: 'kyk-uni',
    name: 'KYK Yurtları - Karabük Üniv.',
    code: 'KYK',
    stops: ['İsmail Necati Efendi KYK', 'Safranbolu KYK', 'Kıranköy', 'Demir Çelik Kampüsü'],
    color: '#EC4899', // Pink
    icon: 'graduation-cap',
    schedule: {
      weekday: {
        departuresFromStart: ['07:30', '08:00', '08:30', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '17:30'],
        departuresFromEnd: ['08:00', '08:30', '09:00', '09:30', '10:30', '11:30', '12:30', '13:30', '14:30', '15:30', '16:30', '17:30', '18:00']
      },
      weekend: null
    }
  },
  {
    id: 'toki-kirankoy',
    name: 'Kırkille / Akçasu / Yazıköy TOKİ - Kıranköy',
    code: 'TK',
    stops: ['Kırkille', 'Akçasu', 'Yazıköy TOKİ', 'Aşağı Toki', 'Aslanlar', 'Kıranköy'],
    color: '#8B5CF6', // Purple
    icon: 'home',
    schedule: {
      weekday: {
        departuresFromStart: ['07:15', '08:15', '09:15', '10:15', '12:15', '14:15', '16:15', '17:15', '18:15'],
        departuresFromEnd: ['07:45', '08:45', '09:45', '10:45', '12:45', '14:45', '16:45', '17:45', '18:45']
      },
      weekend: null
    }
  }
];
