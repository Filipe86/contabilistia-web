import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css'
})
export class LandingPage {
  constructor(title: Title, meta: Meta) {
    title.setTitle('ContabilistIA | Gestão de faturas e automação fiscal');
    meta.updateTag({
      name: 'description',
      content: 'Automatize a leitura e classificação de faturas, reveja o IVA dedutível e valide documentos com a ContabilistIA, a plataforma fiscal para gabinetes de contabilidade.',
    });
    meta.updateTag({ name: 'robots', content: 'index,follow' });
    meta.updateTag({
      property: 'og:title',
      content: 'ContabilistIA | Gestão de faturas e automação fiscal',
    });
    meta.updateTag({
      property: 'og:description',
      content: 'Leia, classifique e valide faturas com apoio à revisão fiscal, SNC e IVA.',
    });
  }
}
