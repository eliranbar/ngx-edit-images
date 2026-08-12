import { TestBed } from '@angular/core/testing';
import { provideImageEditor, ImageEditorComponent } from 'ngx-image-editor';

describe('ImageEditorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageEditorComponent],
      providers: [provideImageEditor({ theme: 'dark', extraFeatures: [] })],
    }).compileComponents();
  });

  it('should create', async () => {
    const fixture = TestBed.createComponent(ImageEditorComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('offers modern and archival download formats', async () => {
    const fixture = TestBed.createComponent(ImageEditorComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.showExport.set(true);
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll(
      '.ngx-nie__export-card select option',
    ) as NodeListOf<HTMLOptionElement>;
    const values = Array.from(options, (option) => option.value);
    expect(values).toEqual(expect.arrayContaining(['webp', 'avif', 'gif', 'tiff']));
  });
});
