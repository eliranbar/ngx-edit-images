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
});
