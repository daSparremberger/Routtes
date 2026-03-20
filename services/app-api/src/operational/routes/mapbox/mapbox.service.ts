import { Injectable, BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export type OptimizationCriteria = 'distance' | 'time';

interface Waypoint {
  waypoint_index: number;
}

@Injectable()
export class MapboxService {
  private readonly baseUrl = 'https://api.mapbox.com/optimized-trips/v1/mapbox/driving';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Calls Mapbox Optimization API and returns the reordered stop indices.
   * stops[0] is fixed as source, stops[last] is fixed as destination.
   * Returns array of original indices in the optimized order.
   * NOTE: The Mapbox Optimized Trips v1 endpoint always minimizes duration regardless of criteria.
   * Distance-based reordering is not supported by this endpoint. The `criteria` parameter
   * is preserved in the interface for future API migration (e.g., Matrix API for distance).
   */
  async optimizeRoute(
    stops: { lat: number; lng: number }[],
    criteria: OptimizationCriteria,
  ): Promise<number[]> {
    if (stops.length < 2) {
      return stops.map((_, i) => i);
    }

    const token = this.config.get<string>('MAPBOX_TOKEN');
    const coordinates = stops.map((s) => `${s.lng},${s.lat}`).join(';');

    try {
      const response = await firstValueFrom(
        this.http.get<{ waypoints: Waypoint[] }>(`${this.baseUrl}/${coordinates}`, {
          params: {
            access_token: token,
            roundtrip: false,
            source: 'first',
            destination: 'last',
            // NOTE: Optimized Trips v1 always minimizes travel time; 'criteria' param is
            // reserved for future distance-based API migration. See mapbox.service.ts JSDoc.
            overview: 'full',
          },
        }),
      );

      // waypoints[i].waypoint_index = where original stop i ended up in optimized order
      // We need to return the optimized order: sorted by waypoint_index
      const waypoints = response.data.waypoints;
      const ordered = [...waypoints]
        .sort((a, b) => a.waypoint_index - b.waypoint_index)
        .map((_, optimizedPos) => {
          // Find which original stop is at optimized position
          return waypoints.findIndex((w) => w.waypoint_index === optimizedPos);
        });

      return ordered;
    } catch (err) {
      throw new BadGatewayException('Mapbox optimization service is unavailable');
    }
  }
}
