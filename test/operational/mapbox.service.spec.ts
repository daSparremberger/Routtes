import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { MapboxService } from '../../src/operational/routes/mapbox/mapbox.service';

describe('MapboxService', () => {
  let service: MapboxService;
  let http: jest.Mocked<HttpService>;

  // Mapbox Optimization API response shape (simplified)
  const mapboxResponse = {
    data: {
      waypoints: [
        { waypoint_index: 0, name: '' },
        { waypoint_index: 2, name: '' },
        { waypoint_index: 1, name: '' },
      ],
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MapboxService,
        { provide: HttpService, useValue: { get: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-token') } },
      ],
    }).compile();

    service = module.get(MapboxService);
    http = module.get(HttpService);
  });

  it('should return reordered stop indices from Mapbox API', async () => {
    (http.get as jest.Mock).mockReturnValue(of(mapboxResponse));

    const stops = [
      { lat: -23.5, lng: -46.6 },
      { lat: -23.6, lng: -46.7 },
      { lat: -23.4, lng: -46.5 },
    ];

    const result = await service.optimizeRoute(stops, 'distance');

    // Result should be the reordered indices: [0, 2, 1]
    expect(result).toEqual([0, 2, 1]);
    expect(http.get).toHaveBeenCalledWith(
      expect.stringContaining('optimized-trips'),
      expect.any(Object),
    );
  });

  it('should throw when Mapbox API fails', async () => {
    (http.get as jest.Mock).mockReturnValue(
      new (require('rxjs').throwError)(() => new Error('Mapbox unavailable')),
    );

    const stops = [
      { lat: -23.5, lng: -46.6 },
      { lat: -23.6, lng: -46.7 },
    ];

    await expect(service.optimizeRoute(stops, 'time')).rejects.toThrow();
  });
});
