package com.burak.belediyeapp.service.widget;

import com.burak.belediyeapp.dto.response.widget.PharmacyWidgetItem;
import com.burak.belediyeapp.service.geo.NominatimReverseGeocodeService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class EczanelerGenTrServiceTest {

    private final EczanelerGenTrService service =
            new EczanelerGenTrService(mock(NominatimReverseGeocodeService.class));

    @Test
    void parseReturnsOnlyActiveTodayTabRows() {
        String html = """
                <div class="tab-content" id="nav-tabContent">
                  <div class="tab-pane fade show active" id="nav-bugun" role="tabpanel">
                    <table class="table table-striped mt-2">
                      <tr>
                        <td colspan="3" class="border-bottom">
                          <div class="row" style="font-size:110%%;">
                            <div class="col-lg-3">
                              <a href="/eczane/istanbul-catalca-nurhan-eczanesi"><span class="isim">Nurhan Eczanesi</span></a>
                            </div>
                            <div class='col-lg-6'>
                              Ferhatpaşa Mahallesi, Mescid Sokak No:6/C Çatalca / İstanbul
                              <div class="py-2"><span class='font-italic'>Cumhuriyet Meydanında</span></div>
                            </div>
                            <div class='col-lg-3 py-lg-2'>0 (212) 789-71-06</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </div>
                  <div class="tab-pane fade" id="nav-yarin" role="tabpanel">
                    <table class="table table-striped mt-2">
                      <tr>
                        <td colspan="3" class="border-bottom">
                          <div class="row" style="font-size:110%%;">
                            <div class="col-lg-3">
                              <a href="/eczane/istanbul-catalca-yarin-eczanesi"><span class="isim">Yarin Eczanesi</span></a>
                            </div>
                            <div class='col-lg-6'>Yarin adresi</div>
                            <div class='col-lg-3 py-lg-2'>0 (212) 111-11-11</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </div>
                </div>
                """;

        List<PharmacyWidgetItem> items = service.parse(html, 5);

        assertThat(items).hasSize(1);
        assertThat(items.getFirst().name()).isEqualTo("Nurhan Eczanesi");
        assertThat(items.getFirst().phone()).isEqualTo("0 (212) 789-71-06");
    }

    @Test
    void parseReturnsEmptyWhenOnlyNearbyFallbackRowsExist() {
        String html = """
                <table class="table table-striped mt-2">
                  <tbody>
                    <tr class="bg-danger text-white">
                      <td colspan="3" class="text-center lead">
                        Bugün Zübeydehanım bölgesinde açık <b><u>nöbetçi eczane bulunmuyor</u></b>.
                      </td>
                    </tr>
                    <tr>
                      <td colspan="3" style="font-size:110%%;">
                        <h3>Zübeydehanım Bölgesine En Yakın Nöbetçi Eczaneler</h3>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="3" class="border-bottom">
                        <div class="row" style="font-size:110%%;">
                          <div class="col-lg-3 text-center text-lg-left">
                            <a href="/eczane/istanbul-sultangazi-bahtiyar-eczanesi" class="mb-2 font-weight-bold">Bahtiyar Eczanesi</a>
                            <img src="/resimler/tarif-ikon.png" alt="yol tarifi">
                          </div>
                          <div class="col-lg-6 text-center text-lg-left">
                            Yunus Emre Mahallesi, Adem Yavuz Caddesi No:71/B Sultangazi / İstanbul
                          </div>
                          <div class="col-lg-3 text-center text-lg-left py-2 py-lg-0">
                            <a class="text-dark" href="tel:+902126507656">0 (212) 650-76-56</a>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                """;

        List<PharmacyWidgetItem> items = service.parse(html, 5);

        assertThat(items).isEmpty();
    }
}
