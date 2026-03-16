<script lang="ts">
	import type * as D3 from 'd3';

	// d3 is loaded dynamically so it never appears in the SSR server bundle.
	// (A top-level static import would cause ERR_MODULE_NOT_FOUND in the packaged
	// Electron AppImage, where node_modules are not present at runtime.)
	let d3: typeof D3 | undefined;

	let {
		audioUrl,
		height = 140,
		currentTime = 0,
		duration = 0,
		markerTime,
		markerColor = '#ef4444',
		onSeek
	}: {
		audioUrl: string;
		height?: number;
		currentTime?: number;
		duration?: number;
		markerTime?: number;
		markerColor?: string;
		onSeek?: (time: number) => void;
	} = $props();

	let container: HTMLDivElement | undefined = $state();
	let waveformData: number[] = $state([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	async function loadWaveform(sourceUrl: string = audioUrl) {
		try {
			isLoading = true;
			error = null;

			const audioContext = new AudioContext();
			const response = await fetch(sourceUrl);
			const arrayBuffer = await response.arrayBuffer();
			const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

			// Get the audio data from both channels and merge them
			const channelData = audioBuffer.getChannelData(0);
			const samples = 300; // More samples for smoother visualization
			const blockSize = Math.floor(channelData.length / samples);

			const peaks: number[] = [];
			for (let i = 0; i < samples; i++) {
				let max = 0;
				for (let j = 0; j < blockSize; j++) {
					const val = Math.abs(channelData[i * blockSize + j]);
					if (val > max) max = val;
				}
				peaks.push(max);
			}

			// Normalize peaks
			const maxPeak = Math.max(...peaks);
			waveformData = peaks.map((p) => (maxPeak > 0 ? p / maxPeak : 0));
			isLoading = false;

			// Draw the waveform
			drawWaveform();
		} catch (err) {
			console.error('Error loading waveform:', err);
			error = 'Failed to load waveform';
			isLoading = false;
		}
	}

	function drawWaveform() {
		if (!container || waveformData.length === 0 || !d3) return;
		// Local alias so TypeScript can narrow the type in nested closures below.
		const lib = d3;

		// Clear previous SVG
		lib.select(container).selectAll('svg').remove();

		const containerWidth = container.clientWidth;
		const paddingH = 8;
		const paddingTop = 8;
		const paddingBottom = 22; // extra space for time labels
		const innerWidth = containerWidth - paddingH * 2;
		const innerHeight = height - paddingTop - paddingBottom;
		const midY = innerHeight / 2;

		const svg = lib
			.select(container)
			.append('svg')
			.attr('width', containerWidth)
			.attr('height', height)
			.attr('class', 'cursor-pointer rounded-lg overflow-hidden');

		const defs = svg.append('defs');

		// --- Circuit-board background pattern ---
		const patternSize = 30;
		const pattern = defs
			.append('pattern')
			.attr('id', 'circuit-bg')
			.attr('width', patternSize)
			.attr('height', patternSize)
			.attr('patternUnits', 'userSpaceOnUse');

		pattern
			.append('rect')
			.attr('width', patternSize)
			.attr('height', patternSize)
			.attr('fill', '#080818');

		pattern
			.append('line')
			.attr('x1', 0)
			.attr('y1', patternSize / 2)
			.attr('x2', patternSize)
			.attr('y2', patternSize / 2)
			.attr('stroke', '#141430')
			.attr('stroke-width', 0.8);

		pattern
			.append('line')
			.attr('x1', patternSize / 2)
			.attr('y1', 0)
			.attr('x2', patternSize / 2)
			.attr('y2', patternSize)
			.attr('stroke', '#141430')
			.attr('stroke-width', 0.8);

		pattern
			.append('circle')
			.attr('cx', patternSize / 2)
			.attr('cy', patternSize / 2)
			.attr('r', 1.5)
			.attr('fill', '#1e1e44');

		pattern.append('circle').attr('cx', 0).attr('cy', 0).attr('r', 1).attr('fill', '#1e1e44');

		// --- Glow filter for playhead ---
		const glowFilter = defs
			.append('filter')
			.attr('id', 'playhead-glow')
			.attr('x', '-100%')
			.attr('y', '-100%')
			.attr('width', '300%')
			.attr('height', '300%');

		glowFilter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');

		const feMerge = glowFilter.append('feMerge');
		feMerge.append('feMergeNode').attr('in', 'coloredBlur');
		feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

		// --- Fill gradient: purple → magenta → blue (horizontal) ---
		const fillGradient = defs
			.append('linearGradient')
			.attr('id', 'wf-fill')
			.attr('gradientUnits', 'userSpaceOnUse')
			.attr('x1', paddingH)
			.attr('y1', 0)
			.attr('x2', paddingH + innerWidth)
			.attr('y2', 0);

		fillGradient.append('stop').attr('offset', '0%').attr('stop-color', '#0284c7');
		fillGradient.append('stop').attr('offset', '55%').attr('stop-color', '#c026d3');
		fillGradient.append('stop').attr('offset', '100%').attr('stop-color', '#7c00c8');

		// Background
		svg
			.append('rect')
			.attr('width', containerWidth)
			.attr('height', height)
			.attr('fill', 'url(#circuit-bg)');

		const g = svg.append('g').attr('transform', `translate(${paddingH},${paddingTop})`);

		// Scales
		const xScale = lib
			.scaleLinear()
			.domain([0, waveformData.length - 1])
			.range([0, innerWidth]);

		const yScale = lib.scaleLinear().domain([0, 1]).range([midY, 0]);

		const progress = duration > 0 ? currentTime / duration : 0;
		const progressX = progress * innerWidth;

		// Piecewise contrast function:
		// - d in [0, 0.6]: linear (identity) — quiet/mid sections keep their exact shape
		// - d in [0.6, 1.0]: quadratic squeeze — spreads visual differences in the loud 0.8–1.0 band
		// This prevents heavily-mastered audio from looking like a flat tube while still
		// showing the waveform shape at lower amplitudes.
		const displayData = waveformData.map((d) => {
			if (d <= 0.6) return d;
			const t = (d - 0.6) / 0.4;
			return 0.6 + Math.pow(t, 2) * 0.4;
		});

		// Area generators
		const upperArea = lib
			.area<number>()
			.x((_: number, i: number) => xScale(i))
			.y0(midY)
			.y1((d: number) => yScale(d))
			.curve(lib.curveBasis);

		const lowerArea = lib
			.area<number>()
			.x((_: number, i: number) => xScale(i))
			.y0(midY)
			.y1((d: number) => midY + (midY - yScale(d)))
			.curve(lib.curveBasis);

		// Outline line generators
		const upperLine = lib
			.line<number>()
			.x((_: number, i: number) => xScale(i))
			.y((d: number) => yScale(d))
			.curve(lib.curveBasis);

		const lowerLine = lib
			.line<number>()
			.x((_: number, i: number) => xScale(i))
			.y((d: number) => midY + (midY - yScale(d)))
			.curve(lib.curveBasis);

		// Inner outline lines (slightly reduced amplitude → inside the outer lines)
		const upperLineInner = lib
			.line<number>()
			.x((_: number, i: number) => xScale(i))
			.y((d: number) => yScale(d * 0.86))
			.curve(lib.curveBasis);

		const lowerLineInner = lib
			.line<number>()
			.x((_: number, i: number) => xScale(i))
			.y((d: number) => midY + (midY - yScale(d * 0.86)))
			.curve(lib.curveBasis);

		// Upper fill
		g.append('path')
			.datum(displayData)
			.attr('d', upperArea)
			.attr('fill', 'url(#wf-fill)')
			.attr('opacity', 0.85);

		// Lower fill (reflection — dimmer)
		g.append('path')
			.datum(displayData)
			.attr('d', lowerArea)
			.attr('fill', 'url(#wf-fill)')
			.attr('opacity', 0.35);

		// Outer stroke — cyan
		g.append('path')
			.datum(displayData)
			.attr('d', upperLine)
			.attr('fill', 'none')
			.attr('stroke', '#00e5ff')
			.attr('stroke-width', 1.5);

		g.append('path')
			.datum(displayData)
			.attr('d', lowerLine)
			.attr('fill', 'none')
			.attr('stroke', '#00e5ff')
			.attr('stroke-width', 1.5)
			.attr('opacity', 0.65);

		// Inner stroke — magenta
		g.append('path')
			.datum(displayData)
			.attr('d', upperLineInner)
			.attr('fill', 'none')
			.attr('stroke', '#e040fb')
			.attr('stroke-width', 1);

		g.append('path')
			.datum(displayData)
			.attr('d', lowerLineInner)
			.attr('fill', 'none')
			.attr('stroke', '#e040fb')
			.attr('stroke-width', 1)
			.attr('opacity', 0.65);

		// Playhead
		g.append('line')
			.attr('x1', progressX)
			.attr('x2', progressX)
			.attr('y1', 0)
			.attr('y2', innerHeight)
			.attr('stroke', '#00e5ff')
			.attr('stroke-width', 2)
			.attr('filter', 'url(#playhead-glow)');

		// Marker line
		if (markerTime !== undefined && duration > 0) {
			const markerX = (markerTime / duration) * innerWidth;
			g.append('line')
				.attr('x1', markerX)
				.attr('x2', markerX)
				.attr('y1', 0)
				.attr('y2', innerHeight)
				.attr('stroke', markerColor)
				.attr('stroke-width', 2)
				.attr('opacity', 0.9);
		}

		// Time labels
		const formatTime = (secs: number) => {
			const m = Math.floor(secs / 60);
			const s = Math.floor(secs % 60);
			return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		};

		svg
			.append('text')
			.attr('x', paddingH + 2)
			.attr('y', height - 6)
			.attr('fill', '#00e5ff')
			.attr('font-family', 'monospace')
			.attr('font-size', '11')
			.text(formatTime(currentTime));

		svg
			.append('text')
			.attr('x', containerWidth - paddingH - 2)
			.attr('y', height - 6)
			.attr('fill', '#64748b')
			.attr('font-family', 'monospace')
			.attr('font-size', '11')
			.attr('text-anchor', 'end')
			.text(formatTime(duration));

		// Click handler for seeking
		svg.on('click', function (event: MouseEvent) {
			if (duration === 0) return;
			const [x] = lib.pointer(event);
			const seekProgress = Math.max(0, Math.min(1, (x - paddingH) / innerWidth));
			onSeek?.(seekProgress * duration);
		});

		// Hover effect
		svg
			.on('mouseenter', function (this: SVGSVGElement) {
				lib.select(this).style('opacity', 0.9);
			})
			.on('mouseleave', function (this: SVGSVGElement) {
				lib.select(this).style('opacity', 1);
			});
	}

	$effect(() => {
		let cancelled = false;

		if (!d3) {
			void import('d3').then((d3module) => {
				if (cancelled) return;
				d3 = d3module;
				void loadWaveform();
			});
		}

		const handleResize = () => {
			if (!isLoading && waveformData.length > 0) {
				drawWaveform();
			}
		};
		window.addEventListener('resize', handleResize);

		return () => {
			cancelled = true;
			window.removeEventListener('resize', handleResize);
		};
	});

	$effect(() => {
		const sourceUrl = audioUrl;
		if (d3) {
			void loadWaveform(sourceUrl);
		}
	});

	// Redraw when currentTime or markerTime changes
	$effect(() => {
		if ((currentTime !== undefined || markerTime !== undefined) && !isLoading) {
			drawWaveform();
		}
	});
</script>

{#if isLoading}
	<div class="flex items-center justify-center" style="height: {height}px;">
		<div class="flex items-center gap-2">
			<svg class="h-5 w-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<span class="text-sm text-gray-500 dark:text-gray-400">Loading waveform...</span>
		</div>
	</div>
{:else if error}
	<div class="flex items-center justify-center" style="height: {height}px;">
		<div class="flex items-center gap-2 text-red-500">
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span class="text-sm">{error}</span>
		</div>
	</div>
{:else}
	<div bind:this={container} class="w-full" style="height: {height}px;"></div>
{/if}
