# frozen_string_literal: true

module Rebbot
  module Commands
    class Draw < Rebbot::Commands::Base
      on :draw, description: 'txt2img with stable diffusion'

      METHODS = ['Euler a', 'Euler', 'LMS', 'Heun', 'DPM2', 'DPM2 a', 'DDIM', 'PLMS'].freeze

      def with_options(cmd)
        cmd.string('prompt', 'what to draw', required: true)
        cmd.string('negative', 'what to not to draw')
        cmd.number('cfg_scale', 'CFG scale', min_value: 1, max_value: 30)
        cmd.number('sampling_steps', 'sampling steps', min_value: 1, max_value: 150)
        cmd.string('sampling_method', 'sampling method', choices: METHODS.map { |m| [m, m] })
        cmd.number('batch_size', 'batch size', min_value: 1, max_value: 8)
      end

      def on_event(event)
        request_body = build_request(**event.options.transform_keys(&:to_sym))

        conn = Faraday.new(
          url: 'http://m1.lab.reb.gg:7860',
          headers: { 'Content-Type' => 'application/json' }
        )

        message = event.send_message("🎨 Drawing '#{event.options['prompt']}' ⌛")
        response = conn.post('/api/predict/') do |req|
          req.body = request_body
        end

        json = JSON.parse(response.body)
        images = json['data'].first

        images.each do |img|
          create_and_send_file(event, img)
        end
      end

      private

      def create_and_send_file(event, img)
        tmp = Tempfile.new('drawing')
        begin
          tmp.write(Base64.decode64(img.split('base64,').last))
          tmp.rewind
          event.send_file(tmp, filename: 'drawing.png')
        ensure
          tmp.close
          tmp.unlink
        end
      end

      # there isn't an API yet: https://github.com/AUTOMATIC1111/stable-diffusion-webui/pull/765
      # hacking on the webui's /predict endpoint for now
      def build_request(
        prompt: '',
        negative: '',
        cfg_scale: 7,
        sampling_steps: 20,
        sampling_method: 'Euler a',
        batch_size: 1
      )
        {
          fn_index: 11,
          data: [
            prompt,
            negative,
            'None',
            'None',
            sampling_steps.to_i,
            sampling_method.to_i,
            false,
            false,
            1,
            batch_size.to_i,
            cfg_scale.to_i,
            -1,
            -1,
            0,
            0,
            0,
            false,
            512, # width
            512, # height
            false,
            false,
            0.7,
            'None',
            false,
            nil,
            '',
            false,
            'Seed',
            '',
            'Steps',
            '',
            true,
            false,
            nil,
            '',
            ''
          ]
        }
      end
    end
  end
end
